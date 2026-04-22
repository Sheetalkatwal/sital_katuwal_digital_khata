from decimal import Decimal

from django.db import models
from accounts.models import Customer, Business


# Create your models here.
class Orders(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('completed', 'Completed'),  # for in-store finished payment
        ('cancelled', 'Cancelled'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    PAYMENT_METHOD_CHOICES = [
         ('cash', 'Cash'),
        ('card', 'Card'),
        ('esewa', 'eSewa'),
        ('credit', 'Credit'),
    ]

    pid = models.CharField(max_length=128, unique=True, null=True, blank=True)  # eSewa transaction UUID
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders',null=True,blank=True)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='orders')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivery_lat = models.FloatField(blank=True, null=True)
    delivery_lng = models.FloatField(blank=True, null=True)
    delivery_distance_km = models.FloatField(blank=True, null=True)
    walk_in_customer_name = models.CharField(max_length=255, blank=True, null=True)
    walk_in_customer_phone = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.id} - {self.status}"
    
class OrderItem(models.Model):
    order = models.ForeignKey(Orders, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price_per_item = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} for Order {self.order.id}"



class CustomerLedger(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='ledgers')
    order = models.ForeignKey(Orders, on_delete=models.CASCADE, related_name='ledger_entry')
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Ledger Entry for {self.customer.user.get_full_name()} on {self.created_at}"
    
    def outstanding(self):
        return max(self.amount_due - self.amount_paid, Decimal('0.00'))

    def make_payment(self, amount, *, allow_overpay=False):
        amount = Decimal(amount)
        if amount <= 0:
            raise ValueError("Payment amount must be positive.")
        if self.is_paid or self.amount_due <= 0:
            raise ValueError("This ledger entry is already paid.")
        if amount > self.amount_due:
            if allow_overpay:
                amount = self.amount_due
            else:
                raise ValueError(f"Maximum payable amount is {self.amount_due}.")

        self.amount_paid += amount
        self.amount_due -= amount
        if self.amount_due <= 0:
            self.amount_due = Decimal('0.00')
            self.is_paid = True
        self.save(update_fields=['amount_paid', 'amount_due', 'is_paid', 'updated_at'])
        return amount


class LedgerPayment(models.Model):
    STATUS_CHOICES = (
        ('initiated', 'Initiated'),
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )

    ledger = models.ForeignKey(CustomerLedger, on_delete=models.CASCADE, related_name='payments')
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='ledger_payments')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='ledger_payments')
    transaction_uuid = models.CharField(max_length=128, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    gateway_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"LedgerPayment {self.transaction_uuid} - {self.status}"