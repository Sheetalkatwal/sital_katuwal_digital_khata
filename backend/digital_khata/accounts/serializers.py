from accounts.models import MyUser, UserProfile, Business,Otp,CustomerRequest,Customer
from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.password_validation import validate_password


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Register a regular user. Requires address and phone_number because UserManager.create_user
    enforces their presence.

    inputs: email, first_name, last_name, password, password2, address, phone_number, bio?, avatar?
    output: created MyUser instance with role='user' and created UserProfile.
    """
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True)
    avatar = serializers.ImageField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = MyUser
        fields = ('email', 'first_name', 'last_name', 'password', 'password2', 'address', 'phone_number', 'bio', 'avatar')
        extra_kwargs = {'password': {'write_only': True}, 'password2': {'write_only': True}}

    def validate(self, attrs):
        # password match
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({"error": "Password fields didn't match."})

        # validate password strength using Django validators
        validate_password(attrs.get('password'))

        # ensure required fields for create_user
        if not attrs.get('address') or not attrs.get('phone_number'):
            raise serializers.ValidationError({"error": "Address and phone_number are required."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data.get('email')
        otp_record = Otp.objects.filter(email=email).first()
        if not otp_record:
            raise serializers.ValidationError({"error": "No OTP record found for this email. Please verify your email before registering."})
        if(otp_record.is_verified==False):
            raise serializers.ValidationError({"error": "Email not verified. Please verify your email before registering."})
        otp_record.delete()

        password = validated_data.pop('password')
        validated_data.pop('password2', None)
        bio = validated_data.pop('bio', '')
        avatar = validated_data.pop('avatar', None)
        validated_data.pop('username', None)

        user = MyUser.objects.create_user(
            email=validated_data.pop('email'),
            password=password,
            first_name=validated_data.pop('first_name', ''),
            last_name=validated_data.pop('last_name', ''),
            address=validated_data.pop('address'),
            phone_number=validated_data.pop('phone_number'),
            role='user'
        )

        # create profile
        UserProfile.objects.create(user=user, bio=bio, avatar=avatar)
        Customer.objects.create(user=user)  

        return user


class ShopkeeperRegistrationSerializer(serializers.ModelSerializer):
    """Register a shopkeeper (user with role 'shopkeeper') and create a Business entry.

    inputs: email, first_name, last_name, password, password2, address, phone_number,
            business_name, business_address, pan_number(optional), description(optional), bio?, avatar?
    output: created MyUser instance (role='shopkeeper') and Business + UserProfile.
    """
    password = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True)
    avatar = serializers.ImageField(write_only=True, required=False, allow_null=True)

    business_name = serializers.CharField(write_only=True, required=True)
    lat = serializers.FloatField(write_only=True, required=True)
    lng = serializers.FloatField(write_only=True, required=True)
    pan_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    description = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = MyUser
        fields = ('email', 'first_name', 'last_name', 'password', 'password2', 'address', 'phone_number',
                  'bio', 'avatar', 'business_name', 'lat', 'lng', 'pan_number', 'description')
        extra_kwargs = {'password': {'write_only': True}, 'password2': {'write_only': True}}

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        validate_password(attrs.get('password'))

        if not attrs.get('address') or not attrs.get('phone_number'):
            raise serializers.ValidationError({"address_phone": "Address and phone_number are required."})

        # business-specific required fields
        if not attrs.get('business_name'):
            raise serializers.ValidationError({"business": "business_name is required."})
        
        if not attrs.get('lat') or not attrs.get('lng'):
            raise serializers.ValidationError({"location": "Business location (lat/lng) is required."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data.get('email')
        otp_record = Otp.objects.filter(email=email).first()
        if not otp_record:
            raise serializers.ValidationError({"error": "No OTP record found for this email. Please verify your email before registering."})
        if not otp_record.is_verified:
            raise serializers.ValidationError({"error": "Email not verified. Please verify your email before registering."})
        otp_record.delete()

        password = validated_data.pop('password')
        validated_data.pop('password2', None)

        bio = validated_data.pop('bio', '')
        avatar = validated_data.pop('avatar', None)

        business_name = validated_data.pop('business_name')
        lat = validated_data.pop('lat')
        lng = validated_data.pop('lng')
        pan_number = validated_data.pop('pan_number', '')
        description = validated_data.pop('description', '')

        # remove username if present to avoid duplicate-kwarg in UserManager
        validated_data.pop('username', None)

        # create the user with role shopkeeper
        user = MyUser.objects.create_user(
            email=validated_data.pop('email'),
            password=password,
            first_name=validated_data.pop('first_name', ''),
            last_name=validated_data.pop('last_name', ''),
            address=validated_data.pop('address'),
            phone_number=validated_data.pop('phone_number'),
            role='shopkeeper'
        )

        # create profile
        UserProfile.objects.create(user=user, bio=bio, avatar=avatar)

        # create business linked to this user
        Business.objects.create(
            owner=user,
            business_name=business_name,
            lat=lat,
            lng=lng,
            pan_number=pan_number,
            description=description
        )

        return user

    def validate_email(self, value):
        # Add any email validation logic if needed
        return value
    
    def send_otp(self):
        # Logic to send OTP to the provided email
        pass


class BusinessSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    connection_status = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = ['id', 'business_name', 'owner_name', 'connection_status','lat','lng']

    def get_connection_status(self, obj):
        user = self.context['request'].user
        customer = Customer.objects.get(user=user)
        try:
            request_obj = CustomerRequest.objects.get(user=customer, business=obj)
            return request_obj.status.lower()
        except CustomerRequest.DoesNotExist:
            return 'none' 
    
    def get_owner_name(self, obj):
        return obj.owner.get_full_name()


class CustomerRequestSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()

    class Meta:
        model = CustomerRequest
        fields = ['id', 'customer_name', 'customer_email', 'status', 'created_at', 'updated_at']

    def get_customer_name(self, obj):
        return obj.user.user.get_full_name()

    def get_customer_email(self, obj):
        return obj.user.user.email