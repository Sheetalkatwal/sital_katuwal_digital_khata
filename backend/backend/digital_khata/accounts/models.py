from django.db import models
from django.utils import timezone

from django.contrib.auth.models import AbstractUser, BaseUserManager
from helper_functions import validation
# Create your models here.

USER_ROLES = (
    ('admin', 'Admin'),
    ('user', 'User'),
    ('shopkeeper','Shopkeeper')
    
)

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):

        
        if not email:
            raise ValueError('The Email field must be set')

        is_field_valid = validation.checkEmptyFields(extra_fields, ['address', 'phone_number'])
        if not is_field_valid:
            raise ValueError('Address and Phone number cannot be empty.')
        username = email.split('@')[0]

        email = self.normalize_email(email)
        bio = extra_fields.pop('bio', '')
        user = self.model(email=email, username=username, **extra_fields)

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        username = email.split('@')[0]

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, username, password, **extra_fields)

class MyUser(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    role = models.CharField(max_length=10, choices=USER_ROLES, default='user')
    address = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.email
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    


class UserProfile(models.Model):
    THEME_CHOICES = (
        ("light", "Light"),
        ("dark", "Dark"),
        ("system", "System"),
    )

    user = models.OneToOneField(MyUser, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, default='avatars/default.png')
    theme = models.CharField(max_length=20, choices=THEME_CHOICES, default='light')

    def __str__(self):
        return f"{self.user.username}'s profile"
    


    def is_admin(self):
        return self.role == 'admin'
    
    def is_user(self):
        return self.role == 'user'



class Customer(models.Model):
    user = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='customers')

    def __str__(self):
        return self.user.get_full_name()


class Business(models.Model):
    owner = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='businesses')
    business_name = models.CharField(max_length=255)
    lat = models.FloatField(null=False, blank=False, default=0.0)
    lng = models.FloatField(null=False, blank=False, default=0.0)
    delivery_radius_km = models.FloatField(default=5.0)

    pan_number = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    creatted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('owner', 'business_name')

    def __str__(self):
        return self.business_name

class CustomerRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    )

    user = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='customer_requests')
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='incoming_requests')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'business')

    def __str__(self):
        return f"{self.user.email} -> {self.business.business_name} : {self.status}"

class Otp(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempt_count = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    

    def __str__(self):
        return f"OTP for {self.email} - {self.code}"


class Notification(models.Model):
    CATEGORY_CHOICES = (
        ('loan_payment', 'Loan Payment'),
        ('general', 'General'),
    )

    recipient = models.ForeignKey(MyUser, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='general')
    payload = models.JSONField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    def __str__(self):
        return f"Notification to {self.recipient.email}: {self.title}"