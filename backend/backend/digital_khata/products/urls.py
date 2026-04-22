from django.urls import path,include

from rest_framework.routers import DefaultRouter

from products import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet,basename='product')

urlpatterns = [
    path('', include(router.urls)),
    path('shop/<int:shop_id>/products/', views.ProductPublicShop.as_view(), name='public-shop-products'),
    path('shop/<int:shop_id>/products/<int:product_id>/', views.ProductDetailShopPublic.as_view(), name='public-shop-product-detail'),
]

