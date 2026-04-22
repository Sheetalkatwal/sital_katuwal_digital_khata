from django.urls import path
from carts.views import (
    CartListView,
    CartByShopView,
    AddToCartView,
    UpdateCartItemView,
    RemoveCartItemView,
    ClearCartView,
)

urlpatterns = [

    path("carts/", CartListView.as_view(), name='cart-list'),
    

    path("carts/shop/<int:shop_id>/", CartByShopView.as_view(), name='cart-by-shop'),
    

    path("carts/add/", AddToCartView.as_view(), name='cart-add'),
    

    path("carts/item/<int:item_id>/", UpdateCartItemView.as_view(), name='cart-item-update'),
    

    path("carts/item/<int:item_id>/remove/", RemoveCartItemView.as_view(), name='cart-item-remove'),
    

    path("carts/shop/<int:shop_id>/clear/", ClearCartView.as_view(), name='cart-clear'),
]