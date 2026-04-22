import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchCartByShop, updateCartItem, removeFromCart, clearCart } from '../../../../../../api/Carts'
import { createOrder } from '../../../../../../api/Orders'
import { FiShoppingCart, FiTrash2, FiMinus, FiPlus, FiPackage, FiLoader, FiArrowLeft } from 'react-icons/fi'

const BACKEND_URL = 'http://localhost:8000'

const ManageCarts = () => {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingItem, setEditingItem] = useState(null)
  const [editQuantity, setEditQuantity] = useState(1)

  // Fetch cart for this specific shop
  const { data: cart, isLoading, isError, error } = useQuery({
    queryKey: ['cartByShop', shopId],
    queryFn: () => fetchCartByShop(shopId),
    enabled: !!shopId,
  })

  // Update cart item mutation
  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries(['cartByShop', shopId])
      setEditingItem(null)
    },
  })

  // Remove item mutation
  const removeMutation = useMutation({
    mutationFn: (itemId) => removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries(['cartByShop', shopId])
    },
  })

  // Clear cart mutation
  const clearMutation = useMutation({
    mutationFn: () => clearCart(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries(['cartByShop', shopId])
    },
  })

  // Create order mutation
  const orderMutation = useMutation({
    mutationFn: (orderData) => createOrder(orderData),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['cartByShop', shopId])
      alert(`Order created successfully! Order ID: ${data.order_id}`)
      navigate('/dashboard/customer/orders')
    },
    onError: (error) => {
      alert(`Failed to create order: ${error.response?.data?.error || error.message}`)
    },
  })

  const handleUpdateQuantity = (itemId) => {
    if (editQuantity < 1) return
    updateMutation.mutate({ itemId, quantity: editQuantity })
  }

  const handleRemoveItem = (itemId) => {
    if (confirm('Remove this item from cart?')) {
      removeMutation.mutate(itemId)
    }
  }

  const handleClearCart = () => {
    if (confirm('Clear all items from this cart?')) {
      clearMutation.mutate()
    }
  }

  const handleCheckout = () => {
    if (!cart?.items || cart.items.length === 0) return
    
    const orderData = {
      business_id: parseInt(shopId),
      items: cart.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      payment_method: 'cash',
      order_type: 'online',
      initial_payment: cart.total,
    }
    orderMutation.mutate(orderData)
  }

  const handleBackToProducts = () => {
    navigate(`/dashboard/customer/shops/${shopId}/products`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading cart...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading cart: {error.message}</p>
        <button
          onClick={handleBackToProducts}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Back to Products
        </button>
      </div>
    )
  }

  const items = cart?.items || []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToProducts}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Shopping Cart</h1>
            <p className="text-sm text-gray-500">{cart?.shop_name || 'Shop'}</p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
          >
            <FiTrash2 className="w-4 h-4" />
            Clear Cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500">
          <FiShoppingCart className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">Your cart is empty</p>
          <p className="text-sm mb-4">Add some products to your cart</p>
          <button
            onClick={handleBackToProducts}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cart Items */}
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4"
              >
                {/* Product Image */}
                {item.product_image ? (
                  <img
                    src={`${BACKEND_URL}${item.product_image}`}
                    alt={item.product_name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FiPackage className="w-8 h-8 text-gray-400" />
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                  <p className="text-sm text-gray-500">Rs. {item.price?.toFixed(2)} each</p>
                  <p className="text-xs text-gray-400">Stock: {item.stock_available}</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-3">
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
                        className="ml-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
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
                      <button
                        onClick={() => {
                          setEditingItem(item.id)
                          setEditQuantity(item.quantity)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>

                {/* Subtotal */}
                <div className="text-right min-w-[100px]">
                  <p className="font-semibold text-gray-900">Rs. {item.subtotal?.toFixed(2)}</p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                  disabled={removeMutation.isPending}
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Cart Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Subtotal ({cart?.item_count} items)</span>
              <span className="text-xl font-bold text-gray-900">Rs. {cart?.total?.toFixed(2)}</span>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleBackToProducts}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Continue Shopping
              </button>
              <button
                onClick={handleCheckout}
                disabled={orderMutation.isPending}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {orderMutation.isPending ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiShoppingCart className="w-5 h-5" />
                    Checkout (Rs. {cart?.total?.toFixed(2)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageCarts