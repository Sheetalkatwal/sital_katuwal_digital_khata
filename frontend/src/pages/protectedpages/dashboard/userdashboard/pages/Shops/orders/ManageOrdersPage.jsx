import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchCustomerOrders } from '../../../../../../../api/Orders'
import { 
  FiPackage, FiLoader, FiFilter, FiCalendar, FiChevronDown, 
  FiChevronUp, FiArrowLeft, FiShoppingBag, FiCreditCard 
} from 'react-icons/fi'

const BACKEND_URL = 'http://localhost:8000'

const ManageOrdersPage = () => {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)

  // Fetch orders for this specific shop
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customerOrdersByShop', shopId, statusFilter],
    queryFn: () => fetchCustomerOrders({ 
      business_id: shopId, 
      status: statusFilter || undefined 
    }),
    enabled: !!shopId,
  })

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'shipped':
        return 'bg-blue-100 text-blue-700'
      case 'confirmed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      case 'completed':
        return 'bg-emerald-100 text-emerald-700'
      case 'delivered':
        return 'bg-purple-100 text-purple-700'
      case 'paid':
        return 'bg-teal-100 text-teal-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'esewa':
        return '💚'
      case 'cash':
        return '💵'
      case 'card':
        return '💳'
      case 'credit':
        return '📝'
      default:
        return '💰'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleBackToProducts = () => {
    navigate(`/dashboard/customer/shops/${shopId}/products`)
  }

  const handleViewCart = () => {
    navigate(`/dashboard/customer/shops/${shopId}/carts`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading orders: {error.message}</p>
        <button
          onClick={handleBackToProducts}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Back to Products
        </button>
      </div>
    )
  }

  const orders = data?.orders || []
  const shopName = orders.length > 0 ? orders[0]?.business_name : 'Shop'

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
            <h1 className="text-2xl font-semibold text-gray-800">My Orders</h1>
            <p className="text-sm text-gray-500">{shopName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FiFilter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Orders</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <button
            onClick={handleViewCart}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FiShoppingBag className="w-4 h-4" />
            View Cart
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500 bg-white rounded-xl border border-gray-200 p-8">
          <FiPackage className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm mb-4">
            {statusFilter ? `No ${statusFilter} orders from this shop` : "You haven't placed any orders from this shop yet"}
          </p>
          <button
            onClick={handleBackToProducts}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{orders.length} order(s) found</p>
          
          <AnimatePresence>
            {orders.map((order) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Order Header */}
                <div
                  onClick={() => setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FiPackage className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order.order_id}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FiCalendar className="w-4 h-4" />
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <span>{getPaymentMethodIcon(order.payment_method)}</span>
                        <span className="capitalize">{order.payment_method}</span>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 min-w-[100px] text-right">
                      Rs. {parseFloat(order.total_amount).toFixed(2)}
                    </span>
                    {expandedOrder === order.order_id ? (
                      <FiChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <FiChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedOrder === order.order_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100"
                    >
                      <div className="p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-700 mb-3">Order Items</h4>
                        <div className="space-y-2">
                          {order.items?.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                {item.product_image ? (
                                  <img
                                    src={`${BACKEND_URL}${item.product_image}`}
                                    alt={item.product_name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                    <FiPackage className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-gray-800">{item.product_name}</p>
                                  <p className="text-sm text-gray-500">
                                    Rs. {parseFloat(item.price_per_item).toFixed(2)} × {item.quantity}
                                  </p>
                                </div>
                              </div>
                              <p className="font-semibold text-gray-900">
                                Rs. {(parseFloat(item.price_per_item) * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Order Summary */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Amount</span>
                            <span className="text-xl font-bold text-green-600">
                              Rs. {parseFloat(order.total_amount).toFixed(2)}
                            </span>
                          </div>
                          {order.pid && (
                            <p className="text-xs text-gray-400 mt-2">
                              Transaction ID: {order.pid}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default ManageOrdersPage