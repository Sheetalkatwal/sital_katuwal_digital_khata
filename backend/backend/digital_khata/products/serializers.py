from products.models import Category, Product
from rest_framework import serializers
from accounts.permissions import IsShopkeeper, IsUser

class CategorySerializer(serializers.ModelSerializer):
    permission_classes = [IsShopkeeper]

    class Meta:
        model = Category
        fields = ['id', 'name','business']
        read_only_fields = ['business']
    


class ProductSerializer(serializers.ModelSerializer):
    permission_classes = [IsShopkeeper]
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'description',
            'cost_price', 'selling_price', 'stock',
            'image', 'category_name'
        ]
        read_only_fields = ['business']

    def validate_category(self, category):
        user = self.context['request'].user
        print("Validating category for user:", user)
        print("Category business owner:", category.business.owner)
        if category.business.owner != user:
            raise serializers.ValidationError("Category does not belong to your business.")
        return category


# public serializer

class ProductPublicSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name',read_only=True)
    class Meta:
        model = Product
        fields = ['id','name','image','category_name','selling_price','stock']


class ProductPublicDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name',read_only=True)
    class Meta:
        model = Product
        fields = ['id','name','image','category_name','selling_price','description','stock']