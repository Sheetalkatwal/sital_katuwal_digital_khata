import json
import uuid
import hmac
import hashlib
import base64
import urllib.request
import urllib.parse
from django.conf import settings
from django.db import transaction
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Orders, OrderItem, CustomerLedger
from products.models import Product
from accounts.models import Customer, Business

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    try:
        data = request.data
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    
    data = data.get("data", {})

    products = data.get("products", [])
    business_id = data.get("shopId")
    total_amount = data.get("totalPrice")
    tax_amount = data.get("tax", 0)
    payment_method = "esewa"  # cash/card/esewa/credit

    if not products:
        return JsonResponse({"error": "No products provided"}, status=400)

    if not business_id:
        return JsonResponse({"error": "Shop ID is required"}, status=400)

    try:
        with transaction.atomic():

            # Generate eSewa PID (transaction UUID)
            pid = str(uuid.uuid4())

            business = Business.objects.get(id=business_id)
            
            # Get customer from authenticated user
            try:
                customer = Customer.objects.get(user=request.user)
            except Customer.DoesNotExist:
                return JsonResponse({"error": "You are not registered as a customer."}, status=400)

            # Create main order with pid for eSewa tracking
            order = Orders.objects.create(
                pid=pid,
                business=business,
                customer=customer,
                total_amount=total_amount + tax_amount,
                payment_method="esewa",
                status="pending",
            )

            # Create child items
            for item in products:
                product = Product.objects.get(id=item["id"])
                qty = item["quantity"]

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=qty,
                    price_per_item=product.selling_price,
                )

                # Reduces stock (optional)
                product.stock -= qty
                product.save()

            # Handle credit (ledger)
            # if payment_method == "credit":
            #     CustomerLedger.objects.create(
            #         customer=customer,
            #         order=order,
            #         amount_due=order.total_amount,
            #     )

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    # -------------------------
    # eSewa V2 payment fields
    # -------------------------
    if payment_method == "esewa":

        amount = float(total_amount)
        tax = float(tax_amount)
        total = amount + tax

        product_code = getattr(settings, "ESEWA_PRODUCT_CODE", "EPAYTEST")
        secret_key = getattr(settings, "ESEWA_SECRET_KEY", "8gBm/:&EnhH.1/q")

        signed_field_names = "total_amount,transaction_uuid,product_code"

        message = (
            f"total_amount={total:.2f},"
            f"transaction_uuid={pid},"
            f"product_code={product_code}"
        )

        signature = base64.b64encode(
            hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).digest()
        ).decode()

        pay_url = getattr(
            settings,
            "ESEWA_PAY_URL",
            "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        )

        # Get frontend URL from settings
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

        fields = {
            "amount": f"{amount:.2f}",
            "tax_amount": f"{tax:.2f}",
            "total_amount": f"{total:.2f}",
            "transaction_uuid": pid,
            "product_code": product_code,
            "product_service_charge": "0",
            "product_delivery_charge": "0",
            "success_url": f"{frontend_url}/dashboard/customer/orders/success/",
            "failure_url": f"{frontend_url}/dashboard/customer/orders/failure/",
            "signed_field_names": signed_field_names,
            "signature": signature,
        }

        return JsonResponse({
            "success": True,
            "order_id": order.id,
            "pid": pid,
            "pay_url": pay_url,
            "fields": fields
        })

    # Cash / Card / Credit return
    return JsonResponse({
        "success": True,
        "order_id": order.id,
    })




@csrf_exempt
def esewa_success(request):
    """
    eSewa V2 redirects here on success with base64 encoded data in query param.
    We decode and verify the payment, then mark the order as paid.
    """
    import requests
    
    # eSewa V2 returns data as base64 encoded JSON
    encoded_data = request.GET.get('data')
    
    if not encoded_data:
        return HttpResponse('No payment data received', status=400)
    
    try:
        # Decode the base64 data
        decoded_data = base64.b64decode(encoded_data).decode('utf-8')
        payment_data = json.loads(decoded_data)
        
        transaction_uuid = payment_data.get('transaction_uuid')
        total_amount = payment_data.get('total_amount')
        product_code = payment_data.get('product_code')
        status_val = payment_data.get('status')
        
        if status_val == 'COMPLETE':
            # Verify with eSewa API
            verify_url = getattr(settings, 'ESEWA_VERIFY_URL', 'https://rc-epay.esewa.com.np/api/epay/transaction/status/')
            
            headers = {
                'Content-Type': 'application/json',
            }
            params = {
                'product_code': product_code,
                'total_amount': total_amount,
                'transaction_uuid': transaction_uuid,
            }
            
            try:
                verify_response = requests.get(verify_url, params=params, headers=headers)
                verify_data = verify_response.json()
                
                if verify_data.get('status') == 'COMPLETE':
                    # Mark order as paid
                    try:
                        order = Orders.objects.get(pid=transaction_uuid)
                        order.status = 'paid'
                        order.save()
                        
                        # Redirect to frontend success page
                        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                        return HttpResponse(f'''
                            <html>
                            <head><meta http-equiv="refresh" content="0;url={frontend_url}/dashboard/customer/orders?payment=success"></head>
                            <body>Payment successful! Redirecting...</body>
                            </html>
                        ''')
                    except Orders.DoesNotExist:
                        return HttpResponse('Order not found', status=404)
                else:
                    return HttpResponse('Payment verification failed', status=400)
            except Exception as e:
                return HttpResponse(f'Verification error: {str(e)}', status=500)
        else:
            return HttpResponse('Payment not complete', status=400)
            
    except Exception as e:
        return HttpResponse(f'Error processing payment: {str(e)}', status=400)


@csrf_exempt
def esewa_fail(request):
    """Handle eSewa payment failure/cancellation"""
    encoded_data = request.GET.get('data')
    
    if encoded_data:
        try:
            decoded_data = base64.b64decode(encoded_data).decode('utf-8')
            payment_data = json.loads(decoded_data)
            transaction_uuid = payment_data.get('transaction_uuid')
            
            if transaction_uuid:
                try:
                    order = Orders.objects.get(pid=transaction_uuid)
                    order.status = 'failed'
                    order.save()
                except Orders.DoesNotExist:
                    pass
        except Exception:
            pass
    
    # Redirect to frontend failure page
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    return HttpResponse(f'''
        <html>
        <head><meta http-equiv="refresh" content="0;url={frontend_url}/dashboard/customer/orders?payment=failed"></head>
        <body>Payment failed or cancelled. Redirecting...</body>
        </html>
    ''')
from decimal import Decimal
from django.shortcuts import render
from accounts.permissions import IsUser,IsShopkeeper
from rest_framework.views import APIView

from orders.models import Orders,CustomerLedger
from django.shortcuts import get_object_or_404
from accounts.models import Business,Customer,CustomerRequest
from products.models import Product
from orders.models import OrderItem,Orders
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum, F, ExpressionWrapper
from django.db.models import DecimalField
from django.db import transaction
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from datetime import datetime
# Create your views here.




# class CreateOrderView(APIView):
#                 permission_classes = [IsUser | IsShopkeeper]

#                 def post(self, request):
#                     shopkeeper = request.user

#                     # Get the customer ID from the request
#                     customer_id = request.data.get('customer_id')
#                     items = request.data.get('items')
#                     payment_method = request.data.get('payment_method', 'cash')
#                     order_type = request.data.get('order_type', 'offline')
#                     initial_payment = float(request.data.get('initial_payment', 0))

#                     if not customer_id:
#                         return Response({"error": "Customer ID is required."}, status=400)

#                     if not items or not isinstance(items, list):
#                         return Response({"error": "Items must be a non-empty list."}, status=400)

#                     # Get customer
#                     try:
#                         customer = get_object_or_404(Customer, id=customer_id)
#                         business = get_object_or_404(Business, owner=shopkeeper)
#                         customer_request = get_object_or_404(CustomerRequest, user=customer, business=business,status='accepted')
#                     except Customer.DoesNotExist:
#                         return Response({"error": "Customer not found."}, status=404)

#                     # Get the shopkeeper's business (assume one business per shopkeeper)
#                     try:
#                         business = Business.objects.get(owner=shopkeeper)
#                     except Business.DoesNotExist:
#                         return Response({"error": "You do not have a registered business."}, status=400)

#                     # Create order
#                     order = Orders.objects.create(
#                         customer=customer,
#                         business=business,
#                         payment_method=payment_method,
#                         status='completed' if order_type == 'offline' else 'pending',
#                         total_amount=0  # Will be updated later
#                     )

#                     total_amount = 0

#                     # Add items
#                     for item in items:
#                         try:
#                             product = Product.objects.get(id=item['product_id'], business=business)
#                         except Product.DoesNotExist:
#                             return Response({"error": f"Product with id {item['product_id']} not found."}, status=404)

#                         quantity = int(item['quantity'])
#                         if product.stock < quantity:
#                             return Response({"error": f"Not enough stock for {product.name}."}, status=400)

#                         OrderItem.objects.create(
#                             order=order,
#                             product=product,
#                             quantity=quantity,
#                             price_per_item=product.selling_price
#                         )

#                         total_amount += product.selling_price * quantity
#                         product.stock -= quantity
#                         product.save()

#                     order.total_amount = total_amount
#                     order.save()

#                     # Handle credit payment
#                     amount_due = 0
#                     if payment_method == 'credit':
#                         amount_due = Decimal(total_amount) - Decimal(initial_payment)
#                         is_paid = amount_due == 0
#                         CustomerLedger.objects.create(
#                             customer=customer,
#                             order=order,
#                             amount_due=amount_due,
#                             amount_paid=initial_payment,
#                             is_paid=is_paid
#                         )

#                     return Response({
#                         "message": "Order created successfully.",
#                         "order_id": order.id,
#                         "total_amount": total_amount,
#                         "payment_method": payment_method,
#                         "initial_payment": initial_payment,
#                         "status": order.status,
#                         "amount_due": float(amount_due) if payment_method == 'credit' else 0,
#                     }, status=201)

class CreateOrderView(APIView):
    permission_classes = [IsUser | IsShopkeeper]

    def post(self, request):
        user = request.user

        items = request.data.get('items')
        payment_method = request.data.get('payment_method', 'cash')
        order_type = request.data.get('order_type')   
        initial_payment = float(request.data.get('initial_payment', 0))
        print("initial payment:", initial_payment)

        if not items or not isinstance(items, list):
            raise ValidationError("Items must be a non-empty list.")

        with transaction.atomic():
            if user.role == "user":
                if order_type == "offline":
                    raise ValidationError("You can only do online orders. Offline order can only be done by shopkeepers.")
                if payment_method == "credit":
                    raise ValidationError("Customers cannot use credit payment method for online order.")
                
                try:
                    customer = Customer.objects.get(user=user)
                except Customer.DoesNotExist:
                    raise ValidationError("You are not registered as a customer.")

                business_id = request.data.get("business_id")
                if not business_id:
                    raise ValidationError("Business ID is required.")
                try:
                    business = Business.objects.get(id=business_id)
                except Business.DoesNotExist:
                    raise NotFound("Business not found.")
                
                if not CustomerRequest.objects.filter(
                    user=customer, business=business, status='accepted'
                ).exists():
                    raise PermissionDenied("You are not allowed to order from this business.")
            else:
                shopkeeper = user

                customer_id = request.data.get('customer_id')
                if not customer_id:
                    raise ValidationError("Customer ID is required.")

                try:
                    customer = Customer.objects.get(id=customer_id)
                    business = Business.objects.get(owner=shopkeeper)
                except (Customer.DoesNotExist, Business.DoesNotExist):
                    raise NotFound("Invalid customer or business.")

                if not CustomerRequest.objects.filter(
                    user=customer, business=business, status='accepted'
                ).exists():
                    raise PermissionDenied("Customer is not linked to your business.")

                if order_type not in ["offline", "online"]:
                    order_type = "offline"


            products_to_update = []
            for item in items:
                try:
                    product = Product.objects.get(id=item['product_id'], business=business)
                except Product.DoesNotExist:
                    raise NotFound(f"Product {item.get('product_id')} not found.")
                quantity = int(item['quantity'])
                if product.stock < quantity:
                    raise ValidationError(f"Insufficient stock for {product.name}.")
                products_to_update.append((product, quantity))

            # create order
            order = Orders.objects.create(
                customer=customer,
                business=business,
                payment_method=payment_method,
                status='completed' if order_type == "offline" else "pending",
                total_amount=0
            )

            total_amount = 0

            # create order items and deduct stock
            for product, quantity in products_to_update:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price_per_item=product.selling_price
                )
                total_amount += product.selling_price * quantity
                product.stock -= quantity
                product.save()

            order.total_amount = total_amount
            if order_type == "online" and user.role == 'user':
                if initial_payment != total_amount:
                    print("initial payment:", initial_payment, "total amount:", total_amount)
                    raise ValidationError("Initial payment must cover the total amount for online orders. your total amount is {}".format(total_amount))

            order.save()

            amount_due = 0
            if user.role == "shopkeeper":
                if payment_method == "credit":
                    amount_due = Decimal(total_amount) - Decimal(initial_payment)
                    CustomerLedger.objects.create(
                        customer=customer,
                        order=order,
                        amount_due=amount_due,
                        amount_paid=initial_payment,
                        is_paid=(amount_due == 0)
                    )

            if user.role == "user":
                amount_due = 0

            # success response
            return Response({
                "message": "Order created successfully.",
                "order_id": order.id,
                "role": user.role,
                "order_type": order_type,
                "total_amount": float(total_amount),
                "payment_method": payment_method,
                "initial_payment": initial_payment,
                "amount_due": float(amount_due),
                "status": order.status
            }, status=201)


class ShopkeeperOrdersView(APIView):
                permission_classes = [IsShopkeeper]  # Only shopkeepers can access

                def get(self, request):
                    shopkeeper = request.user

                    # Get the shopkeeper's business
                    try:
                        business = Business.objects.get(owner=shopkeeper)
                    except Business.DoesNotExist:
                        return Response({"error": "You do not have a registered business."}, status=400)

                    # check for aggregate/report queries
                    aggregate = request.query_params.get('aggregate')
                    period = request.query_params.get('period')  # 'month' or 'year'
                    year = request.query_params.get('year')
                    month = request.query_params.get('month')

                    # helper to get start/end for period
                    now = timezone.now()
                    if year:
                        try:
                            year = int(year)
                        except ValueError:
                            year = now.year
                    if month:
                        try:
                            month = int(month)
                        except ValueError:
                            month = now.month

                    start_date = None
                    end_date = None
                    if period == 'month':
                        y = year or now.year
                        m = month or now.month
                        start_date = datetime(y, m, 1)
                        if m == 12:
                            end_date = datetime(y+1, 1, 1)
                        else:
                            end_date = datetime(y, m+1, 1)
                    elif period == 'year':
                        y = year or now.year
                        start_date = datetime(y, 1, 1)
                        end_date = datetime(y+1, 1, 1)

                    # Aggregations
                    if aggregate:
                        # Most sold product
                        if aggregate == 'most_sold_product':
                            items_qs = OrderItem.objects.filter(order__business=business)
                            if start_date and end_date:
                                items_qs = items_qs.filter(order__created_at__gte=start_date, order__created_at__lt=end_date)
                            prod_agg = items_qs.values('product__id', 'product__name').annotate(total_sold=Sum('quantity')).order_by('-total_sold')
                            top = prod_agg.first()
                            return Response({'most_sold_product': top}, status=200)

                        # Top spender (total order amount by customer)
                        if aggregate == 'top_spender':
                            orders_qs = Orders.objects.filter(business=business)
                            if start_date and end_date:
                                orders_qs = orders_qs.filter(created_at__gte=start_date, created_at__lt=end_date)
                            spender_agg = orders_qs.values('customer__id', 'customer__user__first_name', 'customer__user__last_name').annotate(total_spent=Sum('total_amount')).order_by('-total_spent')
                            top = spender_agg.first()
                            return Response({'top_spender': top}, status=200)

                        # Most loan person (highest outstanding due)
                        if aggregate == 'most_loan_person':
                            ledger_qs = CustomerLedger.objects.filter(order__business=business)
                            # sum amount_due per customer (consider current outstanding amount_due)
                            ledger_agg = ledger_qs.values('customer__id', 'customer__user__first_name', 'customer__user__last_name').annotate(total_due=Sum('amount_due')).order_by('-total_due')
                            top = ledger_agg.first()
                            return Response({'most_loan_person': top}, status=200)

                        # Most used money person (highest amount_paid)
                        if aggregate == 'top_payer':
                            ledger_qs = CustomerLedger.objects.filter(order__business=business)
                            if start_date and end_date:
                                ledger_qs = ledger_qs.filter(created_at__gte=start_date, created_at__lt=end_date)
                            payer_agg = ledger_qs.values('customer__id', 'customer__user__first_name', 'customer__user__last_name').annotate(total_paid=Sum('amount_paid')).order_by('-total_paid')
                            top = payer_agg.first()
                            return Response({'top_payer': top}, status=200)

                        return Response({'error': 'Unknown aggregate'}, status=400)

                    # Default: return orders list with richer info
                    orders = Orders.objects.filter(business=business).order_by('-created_at')

                    orders_data = []
                    for order in orders:
                        order_items = OrderItem.objects.filter(order=order)
                        items_data = [
                            {
                                "product_id": item.product.id,
                                "product_name": item.product.name,
                                "product_image": item.product.image.url if item.product.image else None,
                                "quantity": item.quantity,
                                "price_per_item": float(item.price_per_item),
                            }
                            for item in order_items
                        ]

                        # get ledger entry if exists
                        ledger = CustomerLedger.objects.filter(order=order).first()
                        amount_due = float(ledger.amount_due) if ledger else 0
                        amount_paid = float(ledger.amount_paid) if ledger else 0

                        customer_name = order.customer.user.get_full_name() if order.customer else 'Guest'
                        customer_phone = order.customer.user.phone_number if order.customer and hasattr(order.customer.user, 'phone_number') else ''
                        customer_address = order.customer.user.address if order.customer and hasattr(order.customer.user, 'address') else ''

                        orders_data.append({
                            "order_id": order.id,
                            "pid": order.pid,
                            "customer_id": order.customer.id if order.customer else None,
                            "customer_name": customer_name,
                            "customer_phone": customer_phone,
                            "customer_address": customer_address,
                            "total_amount": float(order.total_amount),
                            "payment_method": order.payment_method,
                            "status": order.status,
                            "created_at": order.created_at,
                            "updated_at": order.updated_at,
                            "items": items_data,
                            "item_count": len(items_data),
                            "amount_due": amount_due,
                            "amount_paid": amount_paid,
                            "total_paid_plus_due": amount_due + amount_paid,
                        })

                    return Response({"orders": orders_data}, status=200)

                def post(self, request):
                    # esma chai order from online lai accept garne complete garne k garne vanne hunxa
                    order_id = request.data.get('order_id')
                    action = request.data.get('action')  # 'accept', 'complete','patched','delivered' etc.
                    with transaction.atomic():
                        order = get_object_or_404(Orders, id=order_id, business__owner=request.user)

                        if action == 'accept':
                            # Accept both 'pending' and 'paid' orders
                            if order.status not in ['pending', 'paid']:
                                return Response({"error": "Only pending or paid orders can be accepted."}, status=400)
                            order.status = 'confirmed'
                            order.save()
                            return Response({"message": "Order accepted."}, status=200)

                        elif action == 'shipped':
                            if order.status != 'confirmed':
                                return Response({"error": "Only confirmed orders can be marked as shipped."}, status=400)
                            order.status = 'shipped'
                            order.save()
                            return Response({"message": "Order marked as shipped."}, status=200)

                        elif action == 'delivered':
                            if order.status != 'shipped':
                                return Response({"error": "Only shipped orders can be marked as delivered."}, status=400)
                            order.status = 'delivered'
                            order.save()
                            return Response({"message": "Order marked as delivered."}, status=200)

                        elif action == 'complete':
                            if order.status != 'delivered':
                                return Response({"error": "Only delivered orders can be completed."}, status=400)
                            order.status = 'completed'
                            order.save()
                            return Response({"message": "Order completed."}, status=200)
                            
                        elif action == 'cancel':
                            if order.status in ['completed', 'cancelled']:
                                return Response({"error": "Cannot cancel completed or already cancelled orders."}, status=400)
                            order.status = 'cancelled'
                            order.save()
                            return Response({"message": "Order cancelled."}, status=200)

                        else:
                            return Response({"error": "Unknown action."}, status=400)


class CustomerOrdersView(APIView):
                permission_classes = [IsUser]  # Only customers can access

                def get(self, request):
                    customer_user = request.user

                    # Get the customer object
                    try:
                        customer = Customer.objects.get(user=customer_user)
                    except Customer.DoesNotExist:
                        return Response({"error": "You are not registered as a customer."}, status=400)

                    # Optional business filter (for "business the user clicked")
                    business_id = request.query_params.get('business_id')
                    business = None
                    if business_id:
                        try:
                            business = Business.objects.get(id=int(business_id))
                        except Business.DoesNotExist:
                            return Response({"error": "Business not found."}, status=404)

                        # Ensure the customer has an accepted CustomerRequest for this business
                        has_access = CustomerRequest.objects.filter(user=customer, business=business, status='accepted').exists()
                        if not has_access:
                            return Response({"error": "Access denied. You must be accepted by this business."}, status=403)

                    # support aggregate queries similar to ShopkeeperOrdersView
                    aggregate = request.query_params.get('aggregate')
                    period = request.query_params.get('period')  # 'month' or 'year'
                    year = request.query_params.get('year')
                    month = request.query_params.get('month')

                    now = timezone.now()
                    if year:
                        try:
                            year = int(year)
                        except ValueError:
                            year = now.year
                    if month:
                        try:
                            month = int(month)
                        except ValueError:
                            month = now.month

                    start_date = None
                    end_date = None
                    if period == 'month':
                        y = year or now.year
                        m = month or now.month
                        start_date = datetime(y, m, 1)
                        if m == 12:
                            end_date = datetime(y+1, 1, 1)
                        else:
                            end_date = datetime(y, m+1, 1)
                    elif period == 'year':
                        y = year or now.year
                        start_date = datetime(y, 1, 1)
                        end_date = datetime(y+1, 1, 1)

                    # Aggregations for customer
                    if aggregate:
                        # Most spent product on the specified business (by money = qty * price)
                        if aggregate == 'most_spent_product':
                            items_qs = OrderItem.objects.filter(order__customer=customer)
                            if business:
                                items_qs = items_qs.filter(order__business=business)
                            if start_date and end_date:
                                items_qs = items_qs.filter(order__created_at__gte=start_date, order__created_at__lt=end_date)

                            money_expr = ExpressionWrapper(F('quantity') * F('price_per_item'), output_field=DecimalField())
                            prod_agg = items_qs.values('product__id', 'product__name').annotate(total_spent=Sum(money_expr)).order_by('-total_spent')
                            top = prod_agg.first()
                            return Response({'most_spent_product': top}, status=200)

                        # Total spent by this customer on the specified business
                        if aggregate == 'total_spent_on_business':
                            orders_qs = Orders.objects.filter(customer=customer)
                            if business:
                                orders_qs = orders_qs.filter(business=business)
                            if start_date and end_date:
                                orders_qs = orders_qs.filter(created_at__gte=start_date, created_at__lt=end_date)
                            total = orders_qs.aggregate(total_spent=Sum('total_amount'))
                            return Response({'total_spent': total.get('total_spent') or 0}, status=200)

                        # Customer loans (outstanding ledgers) optionally for business
                        if aggregate == 'loans':
                            ledger_qs = CustomerLedger.objects.filter(customer=customer)
                            if business:
                                ledger_qs = ledger_qs.filter(order__business=business)
                            if start_date and end_date:
                                ledger_qs = ledger_qs.filter(created_at__gte=start_date, created_at__lt=end_date)
                            loans = ledger_qs.values('order__id', 'order__total_amount', 'amount_due', 'amount_paid', 'is_paid')
                            return Response({'loans': list(loans)}, status=200)

                        return Response({'error': 'Unknown aggregate'}, status=400)

                    # Default: return orders list with items
                    orders_qs = Orders.objects.filter(customer=customer)
                    if business:
                        orders_qs = orders_qs.filter(business=business)
                    orders_qs = orders_qs.order_by('-created_at')

                    orders_data = []
                    for order in orders_qs:
                        order_items = OrderItem.objects.filter(order=order)
                        items_data = [
                            {
                                "product_name": item.product.name,
                                "product_image": item.product.image.url if item.product.image else None,
                                "quantity": item.quantity,
                                "price_per_item": float(item.price_per_item),
                            }
                            for item in order_items
                        ]

                        # ledger entries for this order
                        ledger = CustomerLedger.objects.filter(order=order).first()
                        amount_due = float(ledger.amount_due) if ledger else 0
                        amount_paid = float(ledger.amount_paid) if ledger else 0

                        orders_data.append({
                            "order_id": order.id,
                            "pid": order.pid,
                            "business_name": order.business.business_name,
                            "business_id": order.business.id,
                            "total_amount": float(order.total_amount),
                            "payment_method": order.payment_method,
                            "status": order.status,
                            "created_at": order.created_at,
                            "items": items_data,
                            "amount_due": amount_due,
                            "amount_paid": amount_paid,
                            "total_paid_plus_due": amount_paid + amount_due,
                        })
                    return Response({"orders": orders_data}, status=200)