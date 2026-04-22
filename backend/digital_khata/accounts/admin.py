from django.contrib import admin

from accounts.models import MyUser, UserProfile,Customer
# Register your models here.

admin.site.register(MyUser)
admin.site.register(UserProfile)
admin.site.register(Customer)

