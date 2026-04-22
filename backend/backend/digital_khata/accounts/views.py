from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
# from django.utils import timezone
from django.utils import timezone
from datetime import timedelta  
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from accounts.models import Business, Customer, CustomerRequest, Notification, UserProfile
from django.db.models import Q
from accounts.permissions import IsUser, IsShopkeeper, IsAdmin

from accounts.serializers import (
    UserRegistrationSerializer,
    ShopkeeperRegistrationSerializer,
    BusinessSerializer,
    CustomerRequestSerializer,
    BusinessDeliverySettingsSerializer,
    NotificationSerializer,
    CustomerProfileSerializer,
    PasswordChangeSerializer,
)

from helper_functions.validation import validate_email, generate_otp,send_email
from helper_functions.tasks import send_email_task
from accounts.models import Otp,MyUser
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import ValidationError
# Create your views here.


class RegisterView(APIView):
    def post(self, request):
        pass


@api_view(['POST'])
def register_user(request):
    """Register a normal user."""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"email": user.email, "role": user.role}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def register_shopkeeper(request):
    """Register a shopkeeper and create their business."""
    print("this is request data",request.data)
    serializer = ShopkeeperRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"email": user.email, "role": user.role}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
def sendOtp(request):
    email = request.data.get('email')

    email_validation = validate_email(email)
    if not email_validation['status']:
        return Response({'error': email_validation['message']}, status=status.HTTP_400_BAD_REQUEST)
    # Logic to generate and send OTP goes here
    emailExists = Otp.objects.filter(email=email).first()
    if emailExists is None:
        emailExists = False
    
        # Check if there's an existing OTP record
        otp_obj = Otp.objects.filter(email=email).first()
        if otp_obj and otp_obj.is_verified:
            # If a user already exists with this email, it's a duplicate/used email
            try:
                user_exists = MyUser.objects.filter(email=email).exists()
            except Exception:
                user_exists = False

            if user_exists:
                return Response({'error': 'Email is already verified.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'message': 'Email already verified. Proceed to registration.', 'verified': True}, status=status.HTTP_200_OK)
    
    user = MyUser.objects.filter(email=email).first()
    if user:
        return Response({'error': 'Email is already registered.'}, status=status.HTTP_400_BAD_REQUEST)
    recent_otp = Otp.objects.filter(email=email, created_at__gte=timezone.now()-timedelta(minutes=1)).first()
    if recent_otp:
        recent_otp.attempt_count += 1
        recent_otp.save()
        if recent_otp.attempt_count > 5:
            return Response({'error': 'Too many OTP requests. Please try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
    otp = generate_otp()
    expires_at = timezone.now() + timedelta(minutes=10)
    

    otp_record=Otp.objects.update_or_create(email=email, defaults={'code': otp, 'expires_at': expires_at, 'is_verified': False})

    try:
        send_email_task.delay(email, "Your OTP", f"Your OTP code is: {otp}. Please use this to verify your email address. It will expire in 10 minutes.")
    except Exception:
        try:
            send_email(email, "Your OTP", f"Your OTP code is: {otp}. Please use this to verify your email address. It will expire in 10 minutes.")
        except Exception:
            return Response({'error': 'Failed to send OTP. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    return Response({'message': 'OTP sent successfully.'}, status=status.HTTP_200_OK)
    

@api_view(['POST'])
def verifyOtp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')

    email_validation = validate_email(email)
    if not email_validation['status']:
        return Response({'error': email_validation['message']}, status=status.HTTP_400_BAD_REQUEST)

    otp_record = Otp.objects.filter(email=email, code=otp).first()
    if not otp_record:
        return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
    if(otp_record.expires_at < timezone.now()):
        return Response({'error': 'OTP has expired.'}, status=status.HTTP_400_BAD_REQUEST)
    if(otp_record.is_verified):
        return Response({'message': 'OTP already verified.'}, status=status.HTTP_200_OK)
    
    otp_record.is_verified = True
    otp_record.save()


    return Response({'message': 'OTP verified successfully.'}, status=status.HTTP_200_OK)



@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    # Logic for authenticating user goes here
    email_validate = validate_email(email)
    if not email_validate['status']:
        return Response({'error': email_validate['message']}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Create JWT refresh and access tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    return Response({
        'message': 'Login successful.',
        'access': access_token,
        'refresh': refresh_token,
        'email': user.email,
        'role': getattr(user, 'role', None)
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def logout_view(request):
    """Blacklist a refresh token to log the user out.

    Expects JSON body: { "refresh": "<refresh_token>" }
    """
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
    except TokenError:
        return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
    except AttributeError:

        return Response({'error': 'Token blacklist is not configured on the server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception:
        return Response({'error': 'Failed to blacklist token.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AllBusinessListView(APIView):
    permission_classes = [IsUser]
    def get(self, request):
        search = request.query_params.get('search', '').strip()


        if search:
            businesses = Business.objects.filter(
                Q(business_name__icontains=search) |
                Q(owner__first_name__icontains=search) |
                Q(owner__last_name__icontains=search)
            ).order_by('id')
        else:
            businesses = Business.objects.all().order_by('id')
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size', 10)

        result_page = paginator.paginate_queryset(businesses, request)
        serializer = BusinessSerializer(result_page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)
    

class BusinessDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, business_id):
        business = get_object_or_404(Business, id=business_id)
        serializer = BusinessSerializer(business, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ShopkeeperDeliverySettingsView(APIView):
    permission_classes = [IsShopkeeper]

    def _get_business(self, request):
        return get_object_or_404(Business, owner=request.user)

    def get(self, request):
        business = self._get_business(request)
        serializer = BusinessDeliverySettingsSerializer(business)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        print("This is patch",request)
        business = self._get_business(request)
        print("This is busines",business)
        print("This is request data",request.data)
        serializer = BusinessDeliverySettingsSerializer(business, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class HomeView(APIView):
    permission_classes = [IsUser]
    def get(self, request):
        user = request.user
        print("this is user",user)
        return Response({"message": "Welcome to the Home Page!","email":user.email}, status=status.HTTP_200_OK)


class ShopView(APIView):
    permission_classes = [IsUser]
    def get(self, request):
        return Response({"message": "Welcome to the Shop Page!"}, status=status.HTTP_200_OK)


class HandleAddRequest(APIView):
    permission_classes = [IsUser]

    def post(self, request):
        user = request.user
        customer = Customer.objects.get(user=user)
        business_id = request.data.get('business_id')
        action = request.data.get("action")

        if not business_id:
            return Response({"error": "business_id is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            business = Business.objects.get(id=business_id)
        except Business.DoesNotExist:
            return Response({"error": "Business does not exist."},
                            status=status.HTTP_404_NOT_FOUND)

        # Check if a request already exists
        try:
            request_obj = CustomerRequest.objects.get(user=customer, business=business)


            if request_obj.status == "pending":
                return Response({"message": "Request is already pending."},
                                status=status.HTTP_200_OK)

            if request_obj.status == "accepted":
                return Response({"message": "You are already added to this business."},
                                status=status.HTTP_200_OK)


            if request_obj.status == "rejected":
                # Delete the rejected request
                request_obj.delete()
                return Response({"message": "New request submitted."},
                                status=status.HTTP_201_CREATED)

        except CustomerRequest.DoesNotExist:
            CustomerRequest.objects.create(
                user=customer,
                business=business,
                status="pending"
            )
            return Response(
                {"message": f"Request to add business '{business.business_name}' submitted successfully."},
                status=status.HTTP_201_CREATED
            )


class ShopkeeperHomeView(APIView):
    permission_classes = [IsShopkeeper]

    def get(self, request):
        return Response({"message": "Welcome to the Shopkeeper Home Page!"}, status=status.HTTP_200_OK)


class ShopkeeperNotificationListView(APIView):
    permission_classes = [IsShopkeeper]

    def get(self, request):
        limit = request.query_params.get('limit')
        notifications = Notification.objects.filter(recipient=request.user)
        if limit:
            try:
                limit_val = max(int(limit), 1)
                notifications = notifications[:limit_val]
            except ValueError:
                pass
        serializer = NotificationSerializer(notifications, many=True)
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({
            "notifications": serializer.data,
            "unread_count": unread_count,
        }, status=status.HTTP_200_OK)


class ShopkeeperNotificationReadView(APIView):
    permission_classes = [IsShopkeeper]

    def post(self, request):
        mark_all = request.data.get('mark_all')
        ids = request.data.get('ids', [])

        queryset = Notification.objects.filter(recipient=request.user)
        if mark_all:
            updated = queryset.filter(is_read=False).update(is_read=True, read_at=timezone.now())
            return Response({"updated": updated}, status=status.HTTP_200_OK)

        if not isinstance(ids, list) or not ids:
            raise ValidationError("Provide notification ids to mark as read or set mark_all=true.")

        updated = queryset.filter(id__in=ids).update(is_read=True, read_at=timezone.now())
        return Response({"updated": updated}, status=status.HTTP_200_OK)


class CustomerRequestsView(APIView):
    permission_classes = [IsShopkeeper]

    def get(self, request):
        shopkeeper = request.user
        businesses = Business.objects.filter(owner=shopkeeper)

        # Base queryset
        requests_qs = CustomerRequest.objects.filter(
            business__in=businesses
        ).order_by('-created_at')

        # Filter by status if provided: ?status=pending
        status_filter = request.query_params.get('status')
        if status_filter:
            requests_qs = requests_qs.filter(status=status_filter)

        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size', 10)

        result_page = paginator.paginate_queryset(requests_qs, request)
        serializer = CustomerRequestSerializer(result_page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        shopkeeper = request.user
        request_id = request.data.get('request_id')
        action = request.data.get('action')  # 'accept' or 'reject'

        if not request_id or action not in ['accept', 'reject']:
            return Response(
                {"error": "request_id and valid action ('accept' or 'reject') are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            customer_request = CustomerRequest.objects.get(id=request_id, business__owner=shopkeeper)
        except CustomerRequest.DoesNotExist:
            return Response({"error": "Customer request does not exist."}, status=status.HTTP_404_NOT_FOUND)

        if action == 'accept':
            customer_request.status = 'accepted'
            customer_request.save()
        else:
            customer_request.delete()
            customer_request = None # Indicate deletion

        return Response(
            {"message": f"Customer request has been {customer_request.status if customer_request else 'rejected'}."},
            status=status.HTTP_200_OK
        )


class CustomerProfileView(APIView):
    permission_classes = [IsUser]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_profile(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self.get_profile(request.user)
        serializer = CustomerProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        profile = self.get_profile(request.user)
        serializer = CustomerProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class CustomerPasswordChangeView(APIView):
    permission_classes = [IsUser]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class CustomerDashboardView(APIView):
    """Dashboard data for customer - overview of connected shops, orders, spending"""
    permission_classes = [IsUser]

    def get(self, request):
        from orders.models import Orders, OrderItem, CustomerLedger
        from django.db.models import Sum, Count
        from datetime import datetime

        user = request.user
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        # Connected shops count
        connected_shops = CustomerRequest.objects.filter(
            user=customer, status='accepted'
        ).count()

        # Total orders
        total_orders = Orders.objects.filter(customer=customer).count()

        # Total spent (include both 'completed' and 'paid' orders)
        total_spent = Orders.objects.filter(
            customer=customer, status__in=['completed', 'paid']
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        # Pending orders
        pending_orders = Orders.objects.filter(
            customer=customer, status__in=['pending', 'confirmed', 'shipped']
        ).count()

        # Outstanding loans
        outstanding_loans = CustomerLedger.objects.filter(
            customer=customer, is_paid=False
        ).aggregate(total=Sum('amount_due'))['total'] or 0

        # Recent orders (last 5)
        recent_orders = Orders.objects.filter(customer=customer).order_by('-created_at')[:5]
        recent_orders_data = []
        for order in recent_orders:
            recent_orders_data.append({
                "order_id": order.id,
                "shop_name": order.business.business_name,
                "total_amount": float(order.total_amount),
                "status": order.status,
                "created_at": order.created_at.isoformat()
            })

        # Monthly spending for chart (last 6 months)
        now = timezone.now()
        monthly_data = []
        for i in range(5, -1, -1):
            month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            
            month_spent = Orders.objects.filter(
                customer=customer,
                created_at__gte=month_start,
                created_at__lt=month_end,
                status__in=['completed', 'paid']
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            monthly_data.append({
                "month": month_start.strftime("%b %Y"),
                "amount": float(month_spent)
            })

        return Response({
            "connected_shops": connected_shops,
            "total_orders": total_orders,
            "total_spent": float(total_spent),
            "pending_orders": pending_orders,
            "outstanding_loans": float(outstanding_loans),
            "recent_orders": recent_orders_data,
            "monthly_spending": monthly_data
        }, status=200)


class CustomerAnalyticsView(APIView):
    """Detailed analytics for customer - spending patterns, top products, etc."""
    permission_classes = [IsUser]

    def get(self, request):
        from orders.models import Orders, OrderItem, CustomerLedger
        from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField

        user = request.user
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        # Optional period filter
        period = request.query_params.get('period')  # 'month', 'year', 'all'
        
        now = timezone.now()
        start_date = None
        if period == 'month':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'year':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        # Base queryset - include both 'completed' and 'paid' as successful orders
        orders_qs = Orders.objects.filter(customer=customer, status__in=['completed', 'paid'])
        if start_date:
            orders_qs = orders_qs.filter(created_at__gte=start_date)

        # Top products by spending
        items_qs = OrderItem.objects.filter(order__customer=customer, order__status__in=['completed', 'paid'])
        if start_date:
            items_qs = items_qs.filter(order__created_at__gte=start_date)

        money_expr = ExpressionWrapper(F('quantity') * F('price_per_item'), output_field=DecimalField())
        top_products = items_qs.values(
            'product__id', 'product__name'
        ).annotate(
            total_spent=Sum(money_expr),
            total_quantity=Sum('quantity')
        ).order_by('-total_spent')[:5]

        # Spending by shop
        spending_by_shop = orders_qs.values(
            'business__id', 'business__business_name'
        ).annotate(
            total_spent=Sum('total_amount'),
            order_count=Count('id')
        ).order_by('-total_spent')

        # Order status breakdown
        all_orders = Orders.objects.filter(customer=customer)
        if start_date:
            all_orders = all_orders.filter(created_at__gte=start_date)
        
        status_breakdown = all_orders.values('status').annotate(count=Count('id'))

        # Loan summary
        loans = CustomerLedger.objects.filter(customer=customer)
        total_borrowed = loans.aggregate(total=Sum('amount_due'))['total'] or 0
        total_paid = loans.aggregate(total=Sum('amount_paid'))['total'] or 0
        outstanding = loans.filter(is_paid=False).aggregate(total=Sum('amount_due'))['total'] or 0

        # Connected shops count
        connected_shops_count = CustomerRequest.objects.filter(
            user=customer, status='accepted'
        ).count()

        # Total spent from completed/paid orders
        total_spent = orders_qs.aggregate(total=Sum('total_amount'))['total'] or 0

        return Response({
            "top_products": list(top_products),
            "spending_by_shop": list(spending_by_shop),
            "status_breakdown": list(status_breakdown),
            "loan_summary": {
                "total_borrowed": float(total_borrowed),
                "total_paid": float(total_paid),
                "outstanding": float(outstanding)
            },
            "connected_shops_count": connected_shops_count,
            "total_spent": float(total_spent)
        }, status=200)


class ShopkeeperDashboardView(APIView):
    """Dashboard data for shopkeeper - overview of business metrics"""
    permission_classes = [IsShopkeeper]

    def get(self, request):
        from orders.models import Orders, OrderItem, CustomerLedger
        from products.models import Product
        from django.db.models import Sum, Count, F

        shopkeeper = request.user
        try:
            business = Business.objects.get(owner=shopkeeper)
        except Business.DoesNotExist:
            return Response({"error": "You do not have a registered business."}, status=400)

        # Total customers connected
        total_customers = CustomerRequest.objects.filter(
            business=business, status='accepted'
        ).count()

        # Total products
        total_products = Product.objects.filter(business=business).count()

        # Low stock products (less than 5)
        low_stock = Product.objects.filter(business=business, stock__lt=5).count()

        # Total orders
        total_orders = Orders.objects.filter(business=business).count()

        # Total revenue
        total_revenue = Orders.objects.filter(
            business=business, status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        # Pending orders
        pending_orders = Orders.objects.filter(
            business=business, status__in=['pending', 'confirmed', 'shipped']
        ).count()

        # Outstanding receivables
        outstanding = CustomerLedger.objects.filter(
            order__business=business, is_paid=False
        ).aggregate(total=Sum('amount_due'))['total'] or 0

        # Recent orders
        recent_orders = Orders.objects.filter(business=business).order_by('-created_at')[:5]
        recent_orders_data = []
        for order in recent_orders:
            customer_name = order.customer.user.get_full_name() if order.customer else 'Unknown'
            recent_orders_data.append({
                "order_id": order.id,
                "customer_name": customer_name,
                "total_amount": float(order.total_amount),
                "status": order.status,
                "created_at": order.created_at.isoformat()
            })

        # Monthly revenue for chart (last 6 months)
        now = timezone.now()
        monthly_data = []
        for i in range(5, -1, -1):
            month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1)
            
            month_revenue = Orders.objects.filter(
                business=business,
                created_at__gte=month_start,
                created_at__lt=month_end,
                status='completed'
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            monthly_data.append({
                "month": month_start.strftime("%b %Y"),
                "amount": float(month_revenue)
            })

        # Helper functions for inventory metrics
        def percent_change(current, previous):
            current = current or 0
            previous = previous or 0
            if previous == 0:
                return 0 if current == 0 else 100.0
            return round(((current - previous) / previous) * 100, 2)

        def direction_from_change(change_value):
            if change_value > 0:
                return "up"
            if change_value < 0:
                return "down"
            return "flat"

        recent_window_start = now - timedelta(days=7)
        previous_window_start = recent_window_start - timedelta(days=7)

        sold_items_current = OrderItem.objects.filter(
            order__business=business,
            order__status='completed',
            order__created_at__gte=recent_window_start
        ).aggregate(total=Sum('quantity'))['total'] or 0
        sold_items_previous = OrderItem.objects.filter(
            order__business=business,
            order__status='completed',
            order__created_at__gte=previous_window_start,
            order__created_at__lt=recent_window_start
        ).aggregate(total=Sum('quantity'))['total'] or 0
        sold_items_change = percent_change(sold_items_current, sold_items_previous)

        cancelled_items_current = OrderItem.objects.filter(
            order__business=business,
            order__status='cancelled',
            order__created_at__gte=recent_window_start
        ).aggregate(total=Sum('quantity'))['total'] or 0
        cancelled_items_previous = OrderItem.objects.filter(
            order__business=business,
            order__status='cancelled',
            order__created_at__gte=previous_window_start,
            order__created_at__lt=recent_window_start
        ).aggregate(total=Sum('quantity'))['total'] or 0
        cancelled_items_change = percent_change(cancelled_items_current, cancelled_items_previous)

        inventory_on_hand = Product.objects.filter(business=business).aggregate(total=Sum('stock'))['total'] or 0
        low_stock_threshold = 10
        low_stock_products_qs = Product.objects.filter(
            business=business,
            stock__lte=low_stock_threshold
        ).order_by('stock', 'id')[:8]

        stock_alerts = [
            {
                "id": product.id,
                "name": product.name,
                "stock": product.stock,
                "image_url": product.image.url if product.image else None,
                "selling_price": float(product.selling_price)
            }
            for product in low_stock_products_qs
        ]

        stock_history_data = [
            {
                "key": "sold_items",
                "label": "Items sold (7d)",
                "value": int(sold_items_current),
                "trend_pct": sold_items_change,
                "trend_direction": direction_from_change(sold_items_change),
                "caption": "vs previous 7 days"
            },
            {
                "key": "inventory",
                "label": "Inventory on hand",
                "value": int(inventory_on_hand),
                "trend_pct": None,
                "trend_direction": "flat",
                "caption": "current available units"
            },
            {
                "key": "cancelled_items",
                "label": "Cancelled items (7d)",
                "value": int(cancelled_items_current),
                "trend_pct": cancelled_items_change,
                "trend_direction": direction_from_change(cancelled_items_change),
                "caption": "vs previous 7 days"
            },
            {
                "key": "low_stock",
                "label": "Low stock SKUs",
                "value": Product.objects.filter(business=business, stock__lte=low_stock_threshold).count(),
                "trend_pct": None,
                "trend_direction": "flat",
                "caption": f"<= {low_stock_threshold} units"
            }
        ]

        # Hero products (top selling)
        hero_products_qs = OrderItem.objects.filter(
            order__business=business,
            order__status='completed'
        ).values(
            'product__id',
            'product__name',
            'product__description',
            'product__selling_price'
        ).annotate(
            total_sold=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('price_per_item'))
        ).order_by('-total_sold')[:3]

        hero_products = [
            {
                "id": item['product__id'],
                "name": item['product__name'],
                "description": item['product__description'],
                "price": float(item['product__selling_price']) if item['product__selling_price'] is not None else None,
                "quantity_sold": int(item['total_sold'] or 0),
                "total_revenue": float(item['total_revenue'] or 0)
            }
            for item in hero_products_qs
        ]

        # Frequently visiting customers (based on completed orders)
        frequent_customers_qs = Orders.objects.filter(
            business=business,
            status__in=['completed', 'delivered', 'paid']
        ).exclude(customer__isnull=True).values(
            'customer__id',
            'customer__user__first_name',
            'customer__user__last_name'
        ).annotate(
            visits=Count('id'),
            total_spent=Sum('total_amount')
        ).order_by('-visits', '-total_spent')[:5]

        frequent_customers = []
        for customer in frequent_customers_qs:
            first_name = customer.get('customer__user__first_name') or ''
            last_name = customer.get('customer__user__last_name') or ''
            full_name = (first_name + ' ' + last_name).strip() or f"Customer #{customer['customer__id']}"
            frequent_customers.append({
                "id": customer['customer__id'],
                "name": full_name,
                "visits": customer['visits'],
                "total_spent": float(customer['total_spent'] or 0)
            })

        return Response({
            "total_customers": total_customers,
            "total_products": total_products,
            "low_stock": low_stock,
            "total_orders": total_orders,
            "total_revenue": float(total_revenue),
            "pending_orders": pending_orders,
            "outstanding_receivables": float(outstanding),
            "recent_orders": recent_orders_data,
            "monthly_revenue": monthly_data,
            "stock_history": stock_history_data,
            "stock_alerts": stock_alerts,
            "hero_products": hero_products,
            "frequent_customers": frequent_customers
        }, status=200)


class ShopkeeperAnalyticsView(APIView):
    """Detailed analytics for shopkeeper"""
    permission_classes = [IsShopkeeper]

    def get(self, request):
        from orders.models import Orders, OrderItem, CustomerLedger
        from products.models import Product
        from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField

        shopkeeper = request.user
        try:
            business = Business.objects.get(owner=shopkeeper)
        except Business.DoesNotExist:
            return Response({"error": "You do not have a registered business."}, status=400)

        # Optional period filter
        period = request.query_params.get('period')
        now = timezone.now()
        start_date = None
        if period == 'month':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'year':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

        # Top selling products
        items_qs = OrderItem.objects.filter(order__business=business, order__status='completed')
        if start_date:
            items_qs = items_qs.filter(order__created_at__gte=start_date)

        top_products = items_qs.values(
            'product__id', 'product__name'
        ).annotate(
            total_sold=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('price_per_item'))
        ).order_by('-total_sold')[:10]

        # Top customers by spending
        orders_qs = Orders.objects.filter(business=business, status='completed')
        if start_date:
            orders_qs = orders_qs.filter(created_at__gte=start_date)

        top_customers = orders_qs.values(
            'customer__id', 'customer__user__first_name', 'customer__user__last_name'
        ).annotate(
            total_spent=Sum('total_amount'),
            order_count=Count('id')
        ).order_by('-total_spent')[:10]

        # Customers with most outstanding dues
        top_debtors = CustomerLedger.objects.filter(
            order__business=business, is_paid=False
        ).values(
            'customer__id', 'customer__user__first_name', 'customer__user__last_name'
        ).annotate(
            total_due=Sum('amount_due')
        ).order_by('-total_due')[:10]

        # Order status breakdown
        all_orders = Orders.objects.filter(business=business)
        if start_date:
            all_orders = all_orders.filter(created_at__gte=start_date)
        status_breakdown = all_orders.values('status').annotate(count=Count('id'))

        # Payment method breakdown
        payment_breakdown = orders_qs.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        return Response({
            "top_products": list(top_products),
            "top_customers": list(top_customers),
            "top_debtors": list(top_debtors),
            "status_breakdown": list(status_breakdown),
            "payment_breakdown": list(payment_breakdown)
        }, status=200)


class ConnectedShopsView(APIView):
    """Get list of shops the customer is connected to"""
    permission_classes = [IsUser]

    def get(self, request):
        user = request.user
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        connected = CustomerRequest.objects.filter(user=customer, status='accepted')
        
        shops_data = []
        for cr in connected:
            shops_data.append({
                "id": cr.business.id,
                "name": cr.business.business_name,
                "description": cr.business.description,
                "lat": float(cr.business.lat) if cr.business.lat else None,
                "lng": float(cr.business.lng) if cr.business.lng else None,
                "connected_since": cr.created_at.isoformat()
            })

        return Response({"shops": shops_data, "count": len(shops_data)}, status=200)


class ConnectedCustomersView(APIView):
    """Get list of customers connected to the shopkeeper's business"""
    permission_classes = [IsShopkeeper]

    def get(self, request):
        shopkeeper = request.user
        try:
            business = Business.objects.get(owner=shopkeeper)
        except Business.DoesNotExist:
            return Response({"error": "You do not have a registered business."}, status=400)

        connected = CustomerRequest.objects.filter(business=business, status='accepted')
        
        customers_data = []
        for cr in connected:
            customers_data.append({
                "id": cr.user.id,
                "name": cr.user.user.get_full_name(),
                "email": cr.user.user.email,
                "phone": cr.user.user.phone_number if hasattr(cr.user.user, 'phone_number') else None,
                "connected_since": cr.created_at.isoformat()
            })

        return Response({"customers": customers_data}, status=200)
