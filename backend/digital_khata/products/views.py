from django.shortcuts import render
from products.serializers import CategorySerializer, ProductPublicDetailSerializer, ProductSerializer,ProductPublicSerializer
from rest_framework import viewsets, filters
from rest_framework.response import Response
from products.models import Category, Product
from django_filters.rest_framework import DjangoFilterBackend
from products.filters import ProductFilter
from accounts.models import Business
from accounts.permissions import IsUser,IsShopkeeper,ISOwnerOrReadOnly
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

from .paginations import ProductPublicPagination
from rest_framework.decorators import action


# Create your views here.
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        user = self.request.user
        return Category.objects.filter(business__owner=user)

    def perform_create(self, serializer):
        business = Business.objects.get(owner=self.request.user)
        serializer.save(business=business)

class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.
    - Shopkeepers can create, read, update, delete their own products
    - Others can only read products
    """
    serializer_class = ProductSerializer
    permission_classes = [ISOwnerOrReadOnly]
    pagination_class = ProductPublicPagination

    filter_backends = [
        filters.SearchFilter,
        DjangoFilterBackend,
        filters.OrderingFilter
    ]
    search_fields = ['name', 'description', 'category__name']
    filterset_class = ProductFilter
    ordering_fields = ['name', 'selling_price', 'cost_price', 'stock', 'id']
    ordering = ['id']

    def get_queryset(self):
        """
        Shopkeepers see only their own products.
        Other users see all products (read-only).
        """
        user = self.request.user

        # If authenticated shopkeeper, show only their products
        if user.is_authenticated and user.role == 'shopkeeper':
            try:
                business = Business.objects.get(owner=user)
                return Product.objects.filter(business=business)
            except Business.DoesNotExist:
                return Product.objects.none()

        # For everyone else (customers, unauthenticated), show all products
        return Product.objects.all()

    def perform_create(self, serializer):
        """Attach the shopkeeper's business to the new product."""
        business = Business.objects.get(owner=self.request.user)
        serializer.save(business=business)


# public api

class ProductPublicShop(APIView):
    """
    Public API: List products of a specific shop with limited fields.
    Supports pagination.
    """

    def get(self, request, shop_id):
        # Fetch products for the shop
        qs = Product.objects.filter(business_id=shop_id)

        # Pagination
        paginator = PageNumberPagination()
        paginator.page_size = 12
        page = paginator.paginate_queryset(qs, request)

        serializer = ProductPublicSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ProductDetailShopPublic(APIView):
    """
    Public API: Retrieve details of a specific product in a specific shop.
    """

    def get(self, request, shop_id, product_id):
        try:
            product = Product.objects.get(id=product_id, business_id=shop_id)
        except Product.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        serializer = ProductPublicDetailSerializer(product)
        return Response(serializer.data)