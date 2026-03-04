from django.db import models
from products.models import Product
from accounts.views import CustomerRequest
# Create your models here.


class ProductCart(models.Model):
    product = models.ForeignKey(Product,null=False,on_delete=models.CASCADE)
    

class Carts(models.Model):
    customer_request = models.ForeignKey(CustomerRequest,on_delete=models.CASCADE,related_name='carts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart {self.id} for {self.customer_request.user.user.get_full_name()} at {self.customer_request.business.business_name}"


class CartItem(models.Model):
    cart = models.ForeignKey(Carts,on_delete=models.CASCADE,related_name='items')
    product = models.ForeignKey(Product,on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)


    @property
    def subtotal(self):
        return self.product.selling_price * self.quantity

    