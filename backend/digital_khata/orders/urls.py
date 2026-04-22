from django.urls import path
from . import views

urlpatterns = [
    path('api/orders/create/', views.create_order, name='create_order'),
    path('orders/esewa-success/', views.esewa_success, name='esewa_success'),
    path('orders/esewa-fail/', views.esewa_fail, name='esewa_fail'),
    
    # Customer order endpoints
    path('customer-orders/', views.CustomerOrdersView.as_view(), name='customer_orders'),
    
    # Shopkeeper order endpoints
    path('shopkeeper-orders/', views.ShopkeeperOrdersView.as_view(), name='shopkeeper_orders'),
]