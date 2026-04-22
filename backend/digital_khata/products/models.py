from django.db import models

# Create your models here.

class Category(models.Model):
    name = models.CharField(max_length=100)
    business = models.ForeignKey('accounts.Business', on_delete=models.CASCADE, related_name='categories',null=True,blank=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    description = models.TextField()
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField()
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)
    business = models.ForeignKey('accounts.Business', on_delete=models.CASCADE, related_name='products')
    def __str__(self):
        return self.name




# class SoldProduct(models.Model):
#     product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sold_products')
#     quantity = models.IntegerField()
#     sold_at = models.DateTimeField(auto_now_add=True)


#     def __str__(self):
#         return f"{self.quantity} of {self.product.name} sold on {self.sold_at}"
