import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCustomerOrders } from "../../../../../../api/Orders";
import { FiPackage, FiLoader, FiFilter, FiCalendar, FiChevronDown, FiChevronUp } from "react-icons/fi";

const OrderList = () => {
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customerOrders", statusFilter],
    queryFn: () => fetchCustomerOrders({ status: statusFilter || undefined }),
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "shipped":
        return "bg-blue-100 text-blue-700";
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "delivered":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading orders: {error.message}</p>
      </div>
    );
  }

  const orders = data?.orders || [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">My Orders</h2>
        
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
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500">
          <FiPackage className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">No orders found</p>
          <p className="text-sm">
            {statusFilter ? `No ${statusFilter} orders` : "You haven't placed any orders yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="font-bold text-gray-900">Rs. {order.total_amount.toFixed(2)}</span>
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
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100"
                    >
                      <div className="p-4 bg-gray-50">
                        <h4 className="font-medium text-gray-700 mb-3">Order Items</h4>
                        <div className="space-y-2">
                          {order.items?.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                <p className="text-sm text-gray-500">
                                  Rs. {item.price_per_item.toFixed(2)} × {item.quantity}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                Rs. {(item.price_per_item * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Payment Info */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Payment Method</span>
                            <span className="font-medium text-gray-900 capitalize">{order.payment_method}</span>
                          </div>
                          {order.amount_due > 0 && (
                            <div className="flex justify-between text-sm mt-2">
                              <span className="text-gray-600">Amount Due</span>
                              <span className="font-medium text-red-600">Rs. {order.amount_due.toFixed(2)}</span>
                            </div>
                          )}
                          {order.amount_paid > 0 && (
                            <div className="flex justify-between text-sm mt-2">
                              <span className="text-gray-600">Amount Paid</span>
                              <span className="font-medium text-green-600">Rs. {order.amount_paid.toFixed(2)}</span>
                            </div>
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
  );
};

export default OrderList;
