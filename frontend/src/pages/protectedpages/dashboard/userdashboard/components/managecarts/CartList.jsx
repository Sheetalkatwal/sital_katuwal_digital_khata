import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCarts, updateCartItem, removeFromCart, clearCart } from "../../../../../../api/Carts";
import { createOrder } from "../../../../../../api/Orders";
import { FiShoppingCart, FiTrash2, FiMinus, FiPlus, FiPackage, FiLoader } from "react-icons/fi";

const CartList = () => {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState(1);

  // Fetch all carts
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["carts"],
    queryFn: fetchCarts,
  });

  // Update cart item mutation
  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries(["carts"]);
      setEditingItem(null);
    },
  });

  // Remove item mutation
  const removeMutation = useMutation({
    mutationFn: (itemId) => removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries(["carts"]);
    },
  });

  // Clear cart mutation
  const clearMutation = useMutation({
    mutationFn: (shopId) => clearCart(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries(["carts"]);
    },
  });

  // Create order mutation
  const orderMutation = useMutation({
    mutationFn: (orderData) => createOrder(orderData),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["carts"]);
      alert(`Order created successfully! Order ID: ${data.order_id}`);
    },
    onError: (error) => {
      alert(`Failed to create order: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleUpdateQuantity = (itemId) => {
    if (editQuantity < 1) return;
    updateMutation.mutate({ itemId, quantity: editQuantity });
  };

  const handleRemoveItem = (itemId) => {
    if (confirm("Remove this item from cart?")) {
      removeMutation.mutate(itemId);
    }
  };

  const handleClearCart = (shopId, shopName) => {
    if (confirm(`Clear all items from ${shopName}?`)) {
      clearMutation.mutate(shopId);
    }
  };

  const handleBuyNow = (cart) => {
    const orderData = {
      business_id: cart.shop_id,
      items: cart.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      payment_method: "cash",
      order_type: "online",
      initial_payment: cart.total,
    };
    orderMutation.mutate(orderData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading carts...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading carts: {error.message}</p>
      </div>
    );
  }

  const carts = data?.carts || [];

  if (carts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <FiShoppingCart className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">Your cart is empty</p>
        <p className="text-sm">Browse shops and add products to your cart</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">My Carts</h2>
        <span className="text-sm text-gray-500">
          {carts.length} shop{carts.length !== 1 ? "s" : ""} with items
        </span>
      </div>

      <div className="space-y-8">
        <AnimatePresence>
          {carts.map((cart) => (
            <motion.div
              key={cart.cart_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
            >
              {/* Shop Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FiPackage className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{cart.shop_name}</h3>
                    <p className="text-sm text-gray-500">{cart.item_count} item{cart.item_count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleClearCart(cart.shop_id, cart.shop_name)}
                  className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Clear Cart
                </button>
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FiPackage className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-500">Rs. {item.price.toFixed(2)} each</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {editingItem === item.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center">{editQuantity}</span>
                          <button
                            onClick={() => setEditQuantity(Math.min(item.stock_available, editQuantity + 1))}
                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateQuantity(item.id)}
                            className="ml-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                            disabled={updateMutation.isPending}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-600">Qty: {item.quantity}</span>
                          <span className="font-semibold text-gray-900">Rs. {item.subtotal.toFixed(2)}</span>
                          <button
                            onClick={() => {
                              setEditingItem(item.id);
                              setEditQuantity(item.quantity);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                            disabled={removeMutation.isPending}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Cart Total & Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">Rs. {cart.total.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleBuyNow(cart)}
                  disabled={orderMutation.isPending}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {orderMutation.isPending ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiShoppingCart className="w-4 h-4" />
                      Checkout
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CartList;