import json
import uuid
import hmac
import hashlib
import base64
import urllib.request
import urllib.parse
import math
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Orders, OrderItem, CustomerLedger, LedgerPayment
from products.models import Product
from accounts.models import Customer, Business, Notification
from helper_functions.validation import send_email

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


def haversine_distance(lat1, lon1, lat2, lon2):
    """Return the distance in kilometers between two coordinates."""
    if None in [lat1, lon1, lat2, lon2]:
        return None
    r = 6371  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    try:
        data = request.data
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    

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

            delivery_location = data.get("deliveryLocation") or data.get("delivery_location")
            if not isinstance(delivery_location, dict):
                return JsonResponse({"error": "Delivery location is required."}, status=400)

            try:
                delivery_lat = float(delivery_location.get("lat"))
                delivery_lng = float(delivery_location.get("lng"))
            except (TypeError, ValueError):
                return JsonResponse({"error": "Invalid delivery location coordinates."}, status=400)

            coverage_radius = business.delivery_radius_km or 5.0
            distance_from_shop = haversine_distance(business.lat, business.lng, delivery_lat, delivery_lng)
            if distance_from_shop is None:
                return JsonResponse({"error": "Shop location is not configured."}, status=400)

            if distance_from_shop > coverage_radius:
                return JsonResponse({
                    "error": "Selected delivery point is outside the shop's delivery radius.",
                    "distance_km": round(distance_from_shop, 2),
                    "radius_km": round(coverage_radius, 2)
                }, status=400)
            
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
                delivery_lat=delivery_lat,
                delivery_lng=delivery_lng,
                delivery_distance_km=round(distance_from_shop, 3)
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
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    encoded_data = request.GET.get('data')
    if not encoded_data:
        return HttpResponse('No payment data received', status=400)

    try:
        decoded_data = base64.b64decode(encoded_data).decode('utf-8')
        payment_data = json.loads(decoded_data)
    except Exception as exc:
        return HttpResponse(f'Error processing payment: {str(exc)}', status=400)

    transaction_uuid = payment_data.get('transaction_uuid')
    total_amount = payment_data.get('total_amount')
    product_code = payment_data.get('product_code')
    status_val = payment_data.get('status')

    if not transaction_uuid:
        return HttpResponse('Missing transaction reference', status=400)

    order = None
    ledger_payment = None
    try:
        order = Orders.objects.get(pid=transaction_uuid)
    except Orders.DoesNotExist:
        ledger_payment = LedgerPayment.objects.filter(transaction_uuid=transaction_uuid).select_related(
            'ledger__order__business__owner', 'ledger__customer__user', 'customer__user'
        ).first()
        if not ledger_payment:
            return HttpResponse('Transaction not found', status=404)

    success_redirect = f"{frontend_url}/dashboard/customer/orders?payment=success" if order else f"{frontend_url}/dashboard/customer/loans?payment=success"
    failure_redirect = f"{frontend_url}/dashboard/customer/orders?payment=failed" if order else f"{frontend_url}/dashboard/customer/loans?payment=failed"

    if status_val != 'COMPLETE':
        if order:
            order.status = 'failed'
            order.save(update_fields=['status', 'updated_at'])
        else:
            ledger_payment.status = 'failed'
            ledger_payment.save(update_fields=['status', 'updated_at'])
        return HttpResponse(
            f'''<html><head><meta http-equiv="refresh" content="0;url={failure_redirect}"></head><body>Payment not complete. Redirecting...</body></html>'''
        )

    verify_url = getattr(settings, 'ESEWA_VERIFY_URL', 'https://rc-epay.esewa.com.np/api/epay/transaction/status/')
    headers = {'Content-Type': 'application/json'}
    params = {
        'product_code': product_code,
        'total_amount': total_amount,
        'transaction_uuid': transaction_uuid,
    }

    try:
        verify_response = requests.get(verify_url, params=params, headers=headers, timeout=15)
        verify_data = verify_response.json()
    except Exception as exc:
        if order:
            order.status = 'failed'
            order.save(update_fields=['status', 'updated_at'])
        else:
            ledger_payment.status = 'failed'
            ledger_payment.gateway_response = {'error': str(exc)}
            ledger_payment.save(update_fields=['status', 'gateway_response', 'updated_at'])
        return HttpResponse(f'Verification error: {str(exc)}', status=500)

    if verify_data.get('status') != 'COMPLETE':
        if order:
            order.status = 'failed'
            order.save(update_fields=['status', 'updated_at'])
        else:
            ledger_payment.status = 'failed'
            ledger_payment.gateway_response = verify_data
            ledger_payment.save(update_fields=['status', 'gateway_response', 'updated_at'])
        return HttpResponse(
            f'''<html><head><meta http-equiv="refresh" content="0;url={failure_redirect}"></head><body>Payment verification failed. Redirecting...</body></html>'''
        )

    if order:
        order.status = 'pending'
        order.save(update_fields=['status', 'updated_at'])
    else:
        ledger_payment.status = 'completed'
        ledger_payment.gateway_response = verify_data
        ledger_payment.save(update_fields=['status', 'gateway_response', 'updated_at'])
        applied_amount = ledger_payment.ledger.make_payment(ledger_payment.amount, allow_overpay=True)
        notify_shopkeeper_of_ledger_payment(ledger_payment, applied_amount)

    return HttpResponse(
        f'''<html><head><meta http-equiv="refresh" content="0;url={success_redirect}"></head><body>Payment verified! Redirecting...</body></html>'''
    )


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
                    order.save(update_fields=['status', 'updated_at'])
                except Orders.DoesNotExist:
                    ledger_payment = LedgerPayment.objects.filter(transaction_uuid=transaction_uuid).first()
                    if ledger_payment:
                        ledger_payment.status = 'failed'
                        ledger_payment.save(update_fields=['status', 'updated_at'])
        except Exception:
            pass
    
    # Redirect to frontend failure page
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    redirect_url = f"{frontend_url}/dashboard/customer/orders?payment=failed"
    if encoded_data:
        try:
            data = json.loads(base64.b64decode(encoded_data).decode('utf-8'))
            txn = data.get('transaction_uuid')
            if txn and LedgerPayment.objects.filter(transaction_uuid=txn).exists():
                redirect_url = f"{frontend_url}/dashboard/customer/loans?payment=failed"
        except Exception:
            pass

    return HttpResponse(f'''
        <html>
        <head><meta http-equiv="refresh" content="0;url={redirect_url}"></head>
        <body>Payment failed or cancelled. Redirecting...</body>
        </html>
    ''')
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
from django.db.models import Sum, F, ExpressionWrapper, Count
from django.db.models import DecimalField
from django.db.models.functions import Coalesce
from django.db import transaction
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from datetime import datetime, timedelta
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
        walk_in_name = request.data.get('walk_in_name')
        walk_in_phone = request.data.get('walk_in_phone')
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

                try:
                    business = Business.objects.get(owner=shopkeeper)
                except Business.DoesNotExist:
                    raise NotFound("You do not have a registered business.")

                if customer_id:
                    try:
                        customer = Customer.objects.get(id=customer_id)
                    except Customer.DoesNotExist:
                        raise NotFound("Customer not found.")

                    if not CustomerRequest.objects.filter(
                        user=customer, business=business, status='accepted'
                    ).exists():
                        raise PermissionDenied("Customer is not linked to your business.")

                    walk_in_name = None
                    walk_in_phone = None
                else:
                    if not walk_in_name:
                        raise ValidationError("Provide either a connected customer or a walk-in customer name.")
                    customer = None
                    if payment_method == "credit":
                        raise ValidationError("Credit payments require a linked customer.")

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
                total_amount=0,
                walk_in_customer_name=walk_in_name if customer is None else None,
                walk_in_customer_phone=walk_in_phone if customer is None else None
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
                    if customer is None:
                        raise ValidationError("Credit payments require a linked customer.")
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


def serialize_ledger_entry(ledger):
    order = ledger.order
    customer_obj = ledger.customer
    if customer_obj:
        customer_name = customer_obj.user.get_full_name()
        customer_email = customer_obj.user.email
        customer_phone = customer_obj.user.phone_number if hasattr(customer_obj.user, 'phone_number') else ''
    else:
        customer_name = order.walk_in_customer_name or 'Walk-in customer'
        customer_email = ''
        customer_phone = order.walk_in_customer_phone or ''

    return {
        "ledger_id": ledger.id,
        "order_id": order.id,
        "customer_id": customer_obj.id if customer_obj else None,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone,
        "business_name": order.business.business_name,
        "total_amount": float(order.total_amount),
        "amount_paid": float(ledger.amount_paid),
        "amount_due": float(ledger.amount_due),
        "is_paid": ledger.is_paid,
        "payment_method": order.payment_method,
        "created_at": ledger.created_at,
        "updated_at": ledger.updated_at,
    }


def notify_shopkeeper_of_ledger_payment(ledger_payment, amount):
    business = ledger_payment.business
    owner = getattr(business, 'owner', None)
    if not owner:
        return

    customer_user = ledger_payment.customer.user if ledger_payment.customer else None
    customer_name = customer_user.get_full_name() if customer_user else 'Customer'
    if not customer_name.strip():
        customer_name = customer_user.email if customer_user else 'Customer'

    Notification.objects.create(
        recipient=owner,
        title="Loan payment received",
        message=f"{customer_name} paid Rs {amount:.2f} towards order #{ledger_payment.ledger.order.id}.",
        category='loan_payment',
        payload={
            "ledger_id": ledger_payment.ledger.id,
            "order_id": ledger_payment.ledger.order.id,
            "amount": float(amount),
            "customer": customer_name,
        }
    )


class ShopkeeperLedgerListView(APIView):
    permission_classes = [IsShopkeeper]

    def get(self, request):
        business = get_object_or_404(Business, owner=request.user)
        ledgers = CustomerLedger.objects.filter(order__business=business).select_related('order', 'order__business', 'customer__user')
        data = [serialize_ledger_entry(ledger) for ledger in ledgers]
        return Response({"ledgers": data}, status=200)


class ShopkeeperLedgerPaymentView(APIView):
    permission_classes = [IsShopkeeper]

    def post(self, request, ledger_id):
        amount = request.data.get('amount')
        if amount is None:
            raise ValidationError("Amount is required.")
        try:
            amount_decimal = Decimal(amount)
        except Exception:
            raise ValidationError("Invalid amount provided.")

        if amount_decimal <= 0:
            raise ValidationError("Amount must be greater than zero.")

        ledger = get_object_or_404(CustomerLedger, id=ledger_id, order__business__owner=request.user)
        try:
            ledger.make_payment(amount_decimal)
        except ValueError as exc:
            raise ValidationError(str(exc))
        ledger.refresh_from_db()
        return Response(serialize_ledger_entry(ledger), status=200)


class CustomerLedgerView(APIView):
    permission_classes = [IsUser]

    def get(self, request):
        customer = get_object_or_404(Customer, user=request.user)
        ledgers = CustomerLedger.objects.filter(customer=customer).select_related('order__business')
        data = [serialize_ledger_entry(ledger) for ledger in ledgers]
        return Response({"ledgers": data}, status=200)


class CustomerLedgerEsewaPaymentInitView(APIView):
    permission_classes = [IsUser]

    def post(self, request, ledger_id):
        customer = get_object_or_404(Customer, user=request.user)
        ledger = get_object_or_404(CustomerLedger, id=ledger_id, customer=customer)

        if ledger.is_paid or ledger.amount_due <= 0:
            raise ValidationError("This loan is already cleared.")

        amount = request.data.get('amount')
        try:
            amount_decimal = Decimal(amount)
        except Exception:
            raise ValidationError("Provide a valid amount.")

        if amount_decimal <= 0:
            raise ValidationError("Amount must be greater than zero.")

        if amount_decimal > ledger.amount_due:
            raise ValidationError(f"You can only pay up to Rs {ledger.amount_due}.")

        transaction_uuid = str(uuid.uuid4())
        ledger_payment = LedgerPayment.objects.create(
            ledger=ledger,
            business=ledger.order.business,
            customer=customer,
            transaction_uuid=transaction_uuid,
            amount=amount_decimal,
            status='initiated'
        )

        product_code = getattr(settings, "ESEWA_PRODUCT_CODE", "EPAYTEST")
        secret_key = getattr(settings, "ESEWA_SECRET_KEY", "8gBm/:&EnhH.1/q")
        pay_url = getattr(settings, "ESEWA_PAY_URL", "https://rc-epay.esewa.com.np/api/epay/main/v2/form")
        backend_url = getattr(settings, "BACKEND_URL", request.build_absolute_uri('/').rstrip('/'))

        signed_field_names = "total_amount,transaction_uuid,product_code"
        message = (
            f"total_amount={amount_decimal:.2f},"
            f"transaction_uuid={transaction_uuid},"
            f"product_code={product_code}"
        )

        signature = base64.b64encode(
            hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).digest()
        ).decode()

        fields = {
            "amount": f"{amount_decimal:.2f}",
            "tax_amount": "0",
            "total_amount": f"{amount_decimal:.2f}",
            "transaction_uuid": transaction_uuid,
            "product_code": product_code,
            "product_service_charge": "0",
            "product_delivery_charge": "0",
            "success_url": f"{backend_url}/orders/orders/esewa-success/",
            "failure_url": f"{backend_url}/orders/orders/esewa-fail/",
            "signed_field_names": signed_field_names,
            "signature": signature,
        }

        return Response(
            {
                "ledger_payment_id": ledger_payment.id,
                "pay_url": pay_url,
                "fields": fields,
            },
            status=200,
        )


class ShopkeeperLedgerReminderView(APIView):
    permission_classes = [IsShopkeeper]

    def post(self, request, ledger_id):
        ledger = get_object_or_404(
            CustomerLedger,
            id=ledger_id,
            order__business__owner=request.user
        )

        if not ledger.customer or not ledger.customer.user.email:
            raise ValidationError("This ledger is not linked to a customer with an email address.")

        if ledger.amount_due <= 0:
            raise ValidationError("This loan has already been cleared.")

        customer_user = ledger.customer.user
        customer_name = customer_user.get_full_name() or customer_user.username
        due_amount = float(ledger.amount_due)

        default_subject = f"Payment reminder for order #{ledger.order.pid or ledger.order.id}"
        default_message = (
            f"<p>Dear {customer_name},</p>"
            f"<p>This is a gentle reminder that Rs {due_amount:.2f} remains due for your purchase at "
            f"{ledger.order.business.business_name}. Kindly visit the shop and clear the outstanding amount at your earliest convenience.</p>"
            f"<p>Order ID: #{ledger.order.pid or ledger.order.id}</p>"
            "<p>Thank you.</p>"
        )

        subject = request.data.get('subject') or default_subject
        message = request.data.get('message') or default_message

        send_email(customer_user.email, subject, message)

        return Response({"detail": "Reminder email sent."}, status=200)


class ShopkeeperOrdersView(APIView):
    permission_classes = [IsShopkeeper]

    def get(self, request):
        shopkeeper = request.user

        try:
            business = Business.objects.get(owner=shopkeeper)
        except Business.DoesNotExist:
            return Response({"error": "You do not have a registered business."}, status=400)

        aggregate = request.query_params.get('aggregate')
        period = request.query_params.get('period')
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
                end_date = datetime(y + 1, 1, 1)
            else:
                end_date = datetime(y, m + 1, 1)
        elif period == 'year':
            y = year or now.year
            start_date = datetime(y, 1, 1)
            end_date = datetime(y + 1, 1, 1)

        if aggregate:
            if aggregate == 'most_sold_product':
                items_qs = OrderItem.objects.filter(order__business=business)
                if start_date and end_date:
                    items_qs = items_qs.filter(order__created_at__gte=start_date, order__created_at__lt=end_date)
                prod_agg = items_qs.values('product__id', 'product__name').annotate(total_sold=Sum('quantity')).order_by('-total_sold')
                top = prod_agg.first()
                return Response({'most_sold_product': top}, status=200)

            if aggregate == 'top_spender':
                orders_qs = Orders.objects.filter(business=business)
                if start_date and end_date:
                    orders_qs = orders_qs.filter(created_at__gte=start_date, created_at__lt=end_date)
                spender_agg = orders_qs.values('customer__id', 'customer__user__first_name', 'customer__user__last_name').annotate(total_spent=Sum('total_amount')).order_by('-total_spent')
                top = spender_agg.first()
                return Response({'top_spender': top}, status=200)

            if aggregate == 'most_loan_person':
                ledger_qs = CustomerLedger.objects.filter(order__business=business)
                ledger_agg = ledger_qs.values('customer__id', 'customer__user__first_name', 'customer__user__last_name').annotate(total_due=Sum('amount_due')).order_by('-total_due')
                top = ledger_agg.first()
                return Response({'most_loan_person': top}, status=200)

            if aggregate == 'top_payer':
                ledger_qs = CustomerLedger.objects.filter(order__business=business)
                if start_date and end_date:
                    ledger_qs = ledger_qs.filter(created_at__gte=start_date, created_at__lt=end_date)
                payer_agg = ledger_qs.values('customer__id', 'customer__user__first_name', 'customer__user__last_name').annotate(total_paid=Sum('amount_paid')).order_by('-total_paid')
                top = payer_agg.first()
                return Response({'top_payer': top}, status=200)

            return Response({'error': 'Unknown aggregate'}, status=400)

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

            ledger = CustomerLedger.objects.filter(order=order).first()
            amount_due = float(ledger.amount_due) if ledger else 0
            amount_paid = float(ledger.amount_paid) if ledger else 0

            if order.customer:
                customer_name = order.customer.user.get_full_name()
                customer_phone = order.customer.user.phone_number if hasattr(order.customer.user, 'phone_number') else ''
                customer_address = order.customer.user.address if hasattr(order.customer.user, 'address') else ''
            else:
                customer_name = order.walk_in_customer_name or 'Walk-in customer'
                customer_phone = order.walk_in_customer_phone or ''
                customer_address = ''

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
                "ledger_id": ledger.id if ledger else None,
            })

        return Response({"orders": orders_data}, status=200)

    def post(self, request):
        order_id = request.data.get('order_id')
        action = request.data.get('action')
        with transaction.atomic():
            order = get_object_or_404(Orders, id=order_id, business__owner=request.user)

            if action == 'accept':
                if order.status not in ['pending', 'paid']:
                    return Response({"error": "Only pending or paid orders can be accepted."}, status=400)
                order.status = 'confirmed'
                order.save()
                return Response({"message": "Order accepted."}, status=200)

            if action == 'shipped':
                if order.status != 'confirmed':
                    return Response({"error": "Only confirmed orders can be marked as shipped."}, status=400)
                order.status = 'shipped'
                order.save()
                return Response({"message": "Order marked as shipped."}, status=200)

            if action == 'delivered':
                if order.status != 'shipped':
                    return Response({"error": "Only shipped orders can be marked as delivered."}, status=400)
                order.status = 'delivered'
                order.save()
                return Response({"message": "Order marked as delivered."}, status=200)

            if action == 'complete':
                if order.status != 'delivered':
                    return Response({"error": "Only delivered orders can be completed."}, status=400)
                order.status = 'completed'
                order.save()
                return Response({"message": "Order completed."}, status=200)

            if action == 'cancel':
                if order.status in ['completed', 'cancelled']:
                    return Response({"error": "Cannot cancel completed or already cancelled orders."}, status=400)
                order.status = 'cancelled'
                order.save()
                return Response({"message": "Order cancelled."}, status=200)

            return Response({"error": "Unknown action."}, status=400)


class AuditMetricsView(APIView):
    permission_classes = [IsShopkeeper]

    def _parse_custom_range(self, start_str, end_str):
        if not start_str or not end_str:
            raise ValidationError("start_date and end_date are required for custom period.")
        try:
            start = datetime.strptime(start_str, "%Y-%m-%d")
            end = datetime.strptime(end_str, "%Y-%m-%d")
        except ValueError:
            raise ValidationError("Dates must be in YYYY-MM-DD format.")
        start = timezone.make_aware(datetime.combine(start.date(), datetime.min.time()))
        end = timezone.make_aware(datetime.combine(end.date(), datetime.max.time()))
        if end <= start:
            raise ValidationError("end_date must be after start_date.")
        return start, end

    def _get_period_range(self, period, start_str, end_str):
        now = timezone.now()
        if period == 'week':
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        elif period == 'year':
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = start.replace(year=start.year + 1)
        elif period == 'custom':
            return self._parse_custom_range(start_str, end_str)
        else:  # default month
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if start.month == 12:
                end = start.replace(year=start.year + 1, month=1)
            else:
                end = start.replace(month=start.month + 1)
        return start, end

    def get(self, request):
        period = request.query_params.get('period', 'month').lower()
        start_param = request.query_params.get('start_date')
        end_param = request.query_params.get('end_date')

        shopkeeper = request.user
        business = get_object_or_404(Business, owner=shopkeeper)

        start_date, end_date = self._get_period_range(period, start_param, end_param)

        orders_qs = Orders.objects.filter(
            business=business,
            created_at__gte=start_date,
            created_at__lt=end_date
        )
        order_items_qs = OrderItem.objects.filter(
            order__business=business,
            order__created_at__gte=start_date,
            order__created_at__lt=end_date
        )

        revenue = orders_qs.aggregate(total=Coalesce(Sum('total_amount'), Decimal('0')))['total']
        order_items_cost = order_items_qs.annotate(
            line_cost=ExpressionWrapper(
                F('quantity') * F('product__cost_price'),
                output_field=DecimalField(max_digits=14, decimal_places=2)
            )
        )
        cost = order_items_cost.aggregate(total=Coalesce(Sum('line_cost'), Decimal('0')))['total']
        profit = revenue - cost

        total_orders = orders_qs.count()
        avg_order = (revenue / total_orders) if total_orders else Decimal('0')

        ledger_qs = CustomerLedger.objects.filter(
            order__business=business,
            order__created_at__gte=start_date,
            order__created_at__lt=end_date
        )
        outstanding_expr = ExpressionWrapper(
            F('amount_due') - F('amount_paid'),
            output_field=DecimalField(max_digits=12, decimal_places=2)
        )
        outstanding = ledger_qs.aggregate(total=Coalesce(Sum(outstanding_expr), Decimal('0')))['total']
        open_loans = ledger_qs.filter(amount_paid__lt=F('amount_due')).count()

        payment_breakdown = list(
            orders_qs.values('payment_method')
            .annotate(total=Coalesce(Sum('total_amount'), Decimal('0')), count=Count('id'))
            .order_by('-total')
        )

        order_items_stats = order_items_qs.annotate(
            line_revenue=ExpressionWrapper(
                F('quantity') * F('price_per_item'),
                output_field=DecimalField(max_digits=14, decimal_places=2)
            ),
            line_cost=ExpressionWrapper(
                F('quantity') * F('product__cost_price'),
                output_field=DecimalField(max_digits=14, decimal_places=2)
            )
        ).values('product__id', 'product__name')

        product_breakdown = order_items_stats.annotate(
            quantity_sold=Coalesce(Sum('quantity'), 0),
            revenue=Coalesce(Sum('line_revenue'), Decimal('0')),
            cost=Coalesce(Sum('line_cost'), Decimal('0')),
        )

        top_products = []
        for product in product_breakdown:
            product_profit = product['revenue'] - product['cost']
            top_products.append({
                'product_id': product['product__id'],
                'product_name': product['product__name'],
                'quantity_sold': product['quantity_sold'],
                'revenue': float(product['revenue']),
                'cost': float(product['cost']),
                'profit': float(product_profit),
            })
        top_products = sorted(top_products, key=lambda p: p['revenue'], reverse=True)

        def decimal_to_float(value):
            return float(value) if value is not None else 0.0

        response_data = {
            'period': period,
            'start_date': start_date,
            'end_date': end_date,
            'totals': {
                'orders': total_orders,
                'revenue': decimal_to_float(revenue),
                'cost': decimal_to_float(cost),
                'profit': decimal_to_float(profit),
                'average_order_value': decimal_to_float(avg_order),
                'outstanding_loans': decimal_to_float(outstanding),
                'open_loan_count': open_loans,
            },
            'payment_breakdown': [
                {
                    'payment_method': entry['payment_method'],
                    'total': decimal_to_float(entry['total']),
                    'count': entry['count'],
                }
                for entry in payment_breakdown
            ],
            'top_products': top_products,
        }

        return Response(response_data, status=200)




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