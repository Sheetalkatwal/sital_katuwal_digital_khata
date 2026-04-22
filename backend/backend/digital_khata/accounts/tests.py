from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Business, Customer, CustomerRequest, Notification, UserProfile
from accounts.serializers import UserRegistrationSerializer, ShopkeeperRegistrationSerializer
from helper_functions.validation import validate_email, generate_otp
from orders.models import Orders, OrderItem, CustomerLedger
from products.models import Product, Category
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()


class UserRegistrationTestCase(TestCase):
    """Test user registration functionality"""

    def test_register_valid_user(self):
        """Test successful user registration with valid data after OTP verification"""
        email = 'testuser@example.com'
        # Simulate OTP verification
        otp_code = generate_otp()
        from accounts.models import Otp
        Otp.objects.create(
            email=email,
            code=otp_code,
            is_verified=True,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        data = {
            'email': email,
            'password': 'SecurePass123',
            'password2': 'SecurePass123',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '9800000000',
            'address': 'Kathmandu, Nepal',
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.email, 'testuser@example.com')
        self.assertEqual(user.role, 'user')

    def test_register_user_password_mismatch(self):
        """Test registration fails when passwords don't match"""
        data = {
            'email': 'testuser@example.com',
            'password': 'SecurePass123',
            'password2': 'DifferentPass123',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '9800000000',
            'address': 'Kathmandu, Nepal',
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', str(serializer.errors).lower())

    def test_register_user_duplicate_email(self):
        """Test registration fails with duplicate email"""
        # Create first user
        User.objects.create_user(
            email='duplicate@example.com',
            password='TestPass123',
            phone_number='9800000000',
            address='Kathmandu',
            role='user'
        )
        # Try to register with same email
        data = {
            'email': 'duplicate@example.com',
            'password': 'SecurePass123',
            'password2': 'SecurePass123',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone_number': '9811111111',
            'address': 'Pokhara, Nepal',
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class ShopkeeperRegistrationTestCase(TestCase):
    """Test shopkeeper registration and business creation"""

    def test_register_valid_shopkeeper(self):
        """Test successful shopkeeper registration with business"""
        email = 'shopkeeper@example.com'
        # Simulate OTP verification
        otp_code = generate_otp()
        from accounts.models import Otp
        Otp.objects.create(
            email=email,
            code=otp_code,
            is_verified=True,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        data = {
            'email': email,
            'password': 'SecurePass123',
            'password2': 'SecurePass123',
            'first_name': 'Ram',
            'last_name': 'Kumar',
            'phone_number': '9800000000',
            'address': 'Kathmandu',
            'business_name': 'Test Shop',
            'lat': 27.7172,
            'lng': 85.3240,
            'pan_number': 'PAN123456789',
            'description': 'A test shop',
        }
        serializer = ShopkeeperRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.role, 'shopkeeper')
        self.assertTrue(Business.objects.filter(owner=user).exists())

    def test_shopkeeper_business_created(self):
        """Test that business is created when shopkeeper registers"""
        email = 'shop2@example.com'
        otp_code = generate_otp()
        from accounts.models import Otp
        Otp.objects.create(
            email=email,
            code=otp_code,
            is_verified=True,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        
        data = {
            'email': email,
            'password': 'SecurePass123',
            'password2': 'SecurePass123',
            'first_name': 'Hari',
            'last_name': 'Bahadur',
            'phone_number': '9811111111',
            'address': 'Bhaktapur',
            'business_name': 'Hari Shop',
            'lat': 27.7200,
            'lng': 85.3300,
            'pan_number': 'PAN987654321',
            'description': 'Another test shop',
        }
        serializer = ShopkeeperRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        business = Business.objects.get(owner=user)
        self.assertEqual(business.business_name, 'Hari Shop')
        self.assertEqual(float(business.lat), 27.7200)


class EmailValidationTestCase(TestCase):
    """Test email validation utility"""

    def test_valid_email(self):
        """Test valid email format"""
        result = validate_email('user@example.com')
        self.assertTrue(result['status'])

    def test_invalid_email_no_at(self):
        """Test invalid email without @"""
        result = validate_email('userexample.com')
        self.assertFalse(result['status'])

    def test_invalid_email_no_domain(self):
        """Test invalid email without domain"""
        result = validate_email('user@')
        self.assertFalse(result['status'])

    def test_empty_email(self):
        """Test empty email"""
        result = validate_email('')
        self.assertFalse(result['status'])


class OTPGenerationTestCase(TestCase):
    """Test OTP generation utility"""

    def test_otp_generation(self):
        """Test OTP generates a valid numeric string"""
        otp = generate_otp()
        self.assertIsNotNone(otp)
        self.assertTrue(otp.isdigit())

    def test_otp_length(self):
        """Test OTP has reasonable length"""
        otp = generate_otp()
        self.assertGreaterEqual(len(otp), 4)
        self.assertLessEqual(len(otp), 6)

    def test_multiple_otps_different(self):
        """Test that multiple OTPs are different (low probability collision)"""
        otp1 = generate_otp()
        otp2 = generate_otp()
        otp3 = generate_otp()
        # High probability they're different
        self.assertTrue(len({otp1, otp2, otp3}) >= 2)


class CustomerLedgerTestCase(TestCase):
    """Test customer ledger payment tracking"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='customer@example.com',
            password='TestPass123',
            phone_number='9800000000',
            address='Kathmandu',
            role='user'
        )
        self.customer = Customer.objects.create(user=self.user)
        
        self.shopkeeper = User.objects.create_user(
            email='shopkeeper@example.com',
            password='TestPass123',
            phone_number='9811111111',
            address='Bhaktapur',
            role='shopkeeper'
        )
        self.business = Business.objects.create(
            owner=self.shopkeeper,
            business_name='Test Shop',
            lat=27.7172,
            lng=85.3240
        )
        
        self.order = Orders.objects.create(
            customer=self.customer,
            business=self.business,
            total_amount=Decimal('1000.00'),
            payment_method='credit',
            status='completed'
        )

    def test_ledger_creation(self):
        """Test customer ledger creation"""
        ledger = CustomerLedger.objects.create(
            customer=self.customer,
            order=self.order,
            amount_due=Decimal('1000.00'),
            amount_paid=Decimal('0.00'),
            is_paid=False
        )
        self.assertEqual(ledger.amount_due, Decimal('1000.00'))
        self.assertFalse(ledger.is_paid)

    def test_ledger_partial_payment(self):
        """Test partial payment on ledger"""
        ledger = CustomerLedger.objects.create(
            customer=self.customer,
            order=self.order,
            amount_due=Decimal('1000.00'),
            amount_paid=Decimal('0.00'),
            is_paid=False
        )
        # Make partial payment
        ledger.make_payment(Decimal('500.00'), allow_overpay=True)
        self.assertEqual(ledger.amount_paid, Decimal('500.00'))
        self.assertEqual(ledger.amount_due, Decimal('500.00'))
        self.assertFalse(ledger.is_paid)

    def test_ledger_full_payment(self):
        """Test full payment marks ledger as paid"""
        ledger = CustomerLedger.objects.create(
            customer=self.customer,
            order=self.order,
            amount_due=Decimal('1000.00'),
            amount_paid=Decimal('0.00'),
            is_paid=False
        )
        # Pay full amount
        ledger.make_payment(Decimal('1000.00'), allow_overpay=True)
        self.assertEqual(ledger.amount_paid, Decimal('1000.00'))
        self.assertEqual(ledger.amount_due, Decimal('0.00'))
        self.assertTrue(ledger.is_paid)


class ProductModelTestCase(TestCase):
    """Test product model and stock tracking"""

    def setUp(self):
        """Set up test data"""
        self.shopkeeper = User.objects.create_user(
            email='shop@example.com',
            password='TestPass123',
            phone_number='9800000000',
            address='Kathmandu',
            role='shopkeeper'
        )
        self.business = Business.objects.create(
            owner=self.shopkeeper,
            business_name='Product Shop',
            lat=27.7172,
            lng=85.3240
        )
        self.category = Category.objects.create(
            name='Electronics',
            business=self.business
        )

    def test_product_creation(self):
        """Test product creation with stock"""
        product = Product.objects.create(
            name='Laptop',
            category=self.category,
            description='High-performance laptop',
            cost_price=Decimal('50000.00'),
            selling_price=Decimal('75000.00'),
            stock=10,
            business=self.business
        )
        self.assertEqual(product.name, 'Laptop')
        self.assertEqual(product.stock, 10)
        self.assertEqual(product.selling_price, Decimal('75000.00'))

    def test_product_stock_deduction(self):
        """Test deducting stock from product"""
        product = Product.objects.create(
            name='Mouse',
            category=self.category,
            description='Wireless mouse',
            cost_price=Decimal('1000.00'),
            selling_price=Decimal('1500.00'),
            stock=50,
            business=self.business
        )
        # Simulate sale
        product.stock -= 5
        product.save()
        self.assertEqual(product.stock, 45)

    def test_product_string_representation(self):
        """Test product __str__ method"""
        product = Product.objects.create(
            name='Keyboard',
            category=self.category,
            description='Mechanical keyboard',
            cost_price=Decimal('2000.00'),
            selling_price=Decimal('3500.00'),
            stock=20,
            business=self.business
        )
        self.assertEqual(str(product), 'Keyboard')
