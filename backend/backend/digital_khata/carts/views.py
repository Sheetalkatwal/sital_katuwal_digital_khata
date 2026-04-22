from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.models import CustomerRequest, Customer, Business
from accounts.permissions import IsUser
from django.shortcuts import get_object_or_404
from products.models import Product
from carts.models import Carts, CartItem


class CartListView(APIView):
    """List all carts for the logged-in customer (across all connected shops)"""
    permission_classes = [IsUser]

    def get(self, request):
        user = request.user
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        # Get all accepted customer requests (connections to shops)
        customer_requests = CustomerRequest.objects.filter(user=customer, status='accepted')
        
        carts_data = []
        for cr in customer_requests:
            try:
                cart = Carts.objects.get(customer_request=cr)
                cart_items = cart.items.all()
                
                items_data = []
                cart_total = 0
                for item in cart_items:
                    subtotal = float(item.subtotal)
                    cart_total += subtotal
                    items_data.append({
                        "id": item.id,
                        "product_id": item.product.id,
                        "product_name": item.product.name,
                        "product_image": item.product.image.url if item.product.image else None,
                        "price": float(item.product.selling_price),
                        "quantity": item.quantity,
                        "subtotal": subtotal,
                        "stock_available": item.product.stock
                    })
                
                carts_data.append({
                    "cart_id": cart.id,
                    "shop_id": cr.business.id,
                    "shop_name": cr.business.business_name,
                    "items": items_data,
                    "total": cart_total,
                    "item_count": len(items_data)
                })
            except Carts.DoesNotExist:
                # No cart created yet for this shop connection
                continue

        return Response({"carts": carts_data}, status=200)


class CartByShopView(APIView):
    """Get/Create cart for a specific shop"""
    permission_classes = [IsUser]

    def get(self, request, shop_id):
        user = request.user
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        try:
            business = Business.objects.get(id=shop_id)
        except Business.DoesNotExist:
            return Response({"error": "Shop not found."}, status=404)

        # Check if customer is connected to this shop
        try:
            customer_request = CustomerRequest.objects.get(
                user=customer, business=business, status='accepted'
            )
        except CustomerRequest.DoesNotExist:
            return Response({"error": "You are not connected to this shop."}, status=403)

        # Get or create cart
        cart, created = Carts.objects.get_or_create(customer_request=customer_request)
        
        items_data = []
        cart_total = 0
        for item in cart.items.all():
            subtotal = float(item.subtotal)
            cart_total += subtotal
            items_data.append({
                "id": item.id,
                "product_id": item.product.id,
                "product_name": item.product.name,
                "product_image": item.product.image.url if item.product.image else None,
                "price": float(item.product.selling_price),
                "quantity": item.quantity,
                "subtotal": subtotal,
                "stock_available": item.product.stock
            })

        return Response({
            "cart_id": cart.id,
            "shop_id": business.id,
            "shop_name": business.business_name,
            "items": items_data,
            "total": cart_total,
            "item_count": len(items_data)
        }, status=200)


class AddToCartView(APIView):
    """Add item(s) to cart for a specific shop"""
    permission_classes = [IsUser]

    def post(self, request):
        user = request.user
        items = request.data.get("items")
        shop_id = request.data.get("shop_id")

        if not items or not isinstance(items, list):
            return Response({"error": "Items must be a non-empty list"}, status=400)

        if not shop_id:
            return Response({"error": "shop_id is required"}, status=400)

        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        try:
            business = Business.objects.get(id=shop_id)
        except Business.DoesNotExist:
            return Response({"error": "Shop not found."}, status=404)

        try:
            customer_request = CustomerRequest.objects.get(
                user=customer, business=business, status='accepted'
            )
        except CustomerRequest.DoesNotExist:
            return Response({"error": "You are not connected to this shop."}, status=403)

        cart, created = Carts.objects.get_or_create(customer_request=customer_request)

        added_items = []
        for item in items:
            product_id = item.get('product_id')
            quantity = int(item.get('quantity', 1))

            try:
                product = Product.objects.get(id=product_id, business=business)
            except Product.DoesNotExist:
                return Response({"error": f"Product {product_id} not found in this shop."}, status=404)

            if product.stock < quantity:
                return Response({
                    "error": f"Not enough stock for {product.name}. Available: {product.stock}"
                }, status=400)

            cart_item, item_created = CartItem.objects.get_or_create(cart=cart, product=product)
            if not item_created:
                cart_item.quantity += quantity
            else:
                cart_item.quantity = quantity
            cart_item.save()

            added_items.append({
                "id": cart_item.id,
                "product_id": product.id,
                "product_name": product.name,
                "quantity": cart_item.quantity,
                "subtotal": float(cart_item.subtotal)
            })

        return Response({
            "message": "Items added to cart successfully",
            "items": added_items
        }, status=200)


class UpdateCartItemView(APIView):
    """Update quantity of a cart item"""
    permission_classes = [IsUser]

    def patch(self, request, item_id):
        user = request.user
        quantity = request.data.get("quantity")

        if quantity is None:
            return Response({"error": "quantity is required"}, status=400)

        quantity = int(quantity)
        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=400)

        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        # Find the cart item and verify ownership
        try:
            cart_item = CartItem.objects.get(id=item_id)
            # Verify the cart belongs to this customer
            if cart_item.cart.customer_request.user != customer:
                return Response({"error": "Cart item not found."}, status=404)
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found."}, status=404)

        # Check stock
        if cart_item.product.stock < quantity:
            return Response({
                "error": f"Not enough stock. Available: {cart_item.product.stock}"
            }, status=400)

        cart_item.quantity = quantity
        cart_item.save()

        return Response({
            "message": "Cart item updated",
            "id": cart_item.id,
            "quantity": cart_item.quantity,
            "subtotal": float(cart_item.subtotal)
        }, status=200)


class RemoveCartItemView(APIView):
    """Remove an item from cart"""
    permission_classes = [IsUser]

    def delete(self, request, item_id):
        user = request.user

        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        try:
            cart_item = CartItem.objects.get(id=item_id)
            if cart_item.cart.customer_request.user != customer:
                return Response({"error": "Cart item not found."}, status=404)
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found."}, status=404)

        cart_item.delete()
        return Response({"message": "Item removed from cart"}, status=200)


class ClearCartView(APIView):
    """Clear all items from a specific cart (by shop)"""
    permission_classes = [IsUser]

    def delete(self, request, shop_id):
        user = request.user

        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({"error": "You are not registered as a customer."}, status=400)

        try:
            business = Business.objects.get(id=shop_id)
        except Business.DoesNotExist:
            return Response({"error": "Shop not found."}, status=404)

        try:
            customer_request = CustomerRequest.objects.get(
                user=customer, business=business, status='accepted'
            )
        except CustomerRequest.DoesNotExist:
            return Response({"error": "You are not connected to this shop."}, status=403)

        try:
            cart = Carts.objects.get(customer_request=customer_request)
            cart.items.all().delete()
            return Response({"message": "Cart cleared"}, status=200)
        except Carts.DoesNotExist:
            return Response({"message": "Cart is already empty"}, status=200)
    
