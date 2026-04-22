from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from accounts import views

urlpatterns = [
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("request-otp/", views.sendOtp, name="request_otp"),
    path("verify-otp/", views.verifyOtp, name="verify_otp"),
    path("register/user/", views.register_user, name="register_user"),
    path("register/shopkeeper/", views.register_shopkeeper, name="register_shopkeeper"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("businesses/", views.AllBusinessListView.as_view(), name="all_businesses"),
    path("businesses/<int:business_id>/", views.BusinessDetailView.as_view(), name="business_detail"),
    path("home/", views.HomeView.as_view(), name="home"),
    path("shopkeeper/home/", views.ShopkeeperHomeView.as_view(), name="shopkeeper_home"),
    path("shopkeeper/delivery-settings/", views.ShopkeeperDeliverySettingsView.as_view(), name="shopkeeper_delivery_settings"),
    path("shop/", views.ShopView.as_view(), name="shop"),
    path("add-request/", views.HandleAddRequest.as_view(), name="add_request"),
    path("manage-requests/", views.CustomerRequestsView.as_view(), name="manage_requests"),
    
    # Dashboard and Analytics endpoints
    path("customer/dashboard/", views.CustomerDashboardView.as_view(), name="customer_dashboard"),
    path("customer/analytics/", views.CustomerAnalyticsView.as_view(), name="customer_analytics"),
    path("customer/connected-shops/", views.ConnectedShopsView.as_view(), name="connected_shops"),
    path("customer/profile/", views.CustomerProfileView.as_view(), name="customer_profile"),
    path("customer/change-password/", views.CustomerPasswordChangeView.as_view(), name="customer_change_password"),
    path("shopkeeper/dashboard/", views.ShopkeeperDashboardView.as_view(), name="shopkeeper_dashboard"),
    path("shopkeeper/analytics/", views.ShopkeeperAnalyticsView.as_view(), name="shopkeeper_analytics"),
    path("shopkeeper/connected-customers/", views.ConnectedCustomersView.as_view(), name="connected_customers"),
    path("shopkeeper/notifications/", views.ShopkeeperNotificationListView.as_view(), name="shopkeeper_notifications"),
    path("shopkeeper/notifications/mark-read/", views.ShopkeeperNotificationReadView.as_view(), name="shopkeeper_notifications_mark_read"),
]