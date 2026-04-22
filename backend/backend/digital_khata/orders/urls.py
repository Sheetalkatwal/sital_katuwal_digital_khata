from django.urls import path
from . import views

urlpatterns = [
    path('api/orders/create/', views.create_order, name='create_order'),
    path('create-order/', views.CreateOrderView.as_view(), name='offline_create_order'),
    path('orders/esewa-success/', views.esewa_success, name='esewa_success'),
    path('orders/esewa-fail/', views.esewa_fail, name='esewa_fail'),
    
    # Customer order endpoints
    path('customer-orders/', views.CustomerOrdersView.as_view(), name='customer_orders'),
    path('customer/ledgers/', views.CustomerLedgerView.as_view(), name='customer_ledgers'),
    path('customer/ledgers/<int:ledger_id>/pay/esewa/', views.CustomerLedgerEsewaPaymentInitView.as_view(), name='customer_ledger_esewa_pay'),
    
    # Shopkeeper order endpoints
    path('shopkeeper-orders/', views.ShopkeeperOrdersView.as_view(), name='shopkeeper_orders'),
    path('shopkeeper/audit-metrics/', views.AuditMetricsView.as_view(), name='audit_metrics'),
    path('shopkeeper/ledgers/', views.ShopkeeperLedgerListView.as_view(), name='shopkeeper_ledgers'),
    path('shopkeeper/ledgers/<int:ledger_id>/pay/', views.ShopkeeperLedgerPaymentView.as_view(), name='shopkeeper_ledgers_pay'),
    path('shopkeeper/ledgers/<int:ledger_id>/remind/', views.ShopkeeperLedgerReminderView.as_view(), name='shopkeeper_ledgers_remind'),
]