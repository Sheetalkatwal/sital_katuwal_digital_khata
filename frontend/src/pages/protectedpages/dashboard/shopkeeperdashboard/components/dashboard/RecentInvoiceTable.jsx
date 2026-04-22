import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { fetchShopkeeperDashboard } from "../../../../../../api/Dashboard";
import { FiLoader } from "react-icons/fi";

const statusStyles = {
  'completed': 'bg-green-100 text-green-700',
  'delivered': 'bg-purple-100 text-purple-700',
  'shipped': 'bg-blue-100 text-blue-700',
  'confirmed': 'bg-indigo-100 text-indigo-700',
  'pending': 'bg-yellow-100 text-yellow-700',
  'cancelled': 'bg-red-100 text-red-700',
};

const RecentInvoiceTable = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["shopkeeperDashboard"],
    queryFn: fetchShopkeeperDashboard,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5 flex items-center justify-center h-48">
        <FiLoader className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5 text-center text-red-500">
        Failed to load recent orders
      </div>
    );
  }

  const recentOrders = data?.recent_orders || [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Recent Orders</h2>
      {recentOrders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b">
                <th className="py-2 text-left">Order ID</th>
                <th className="py-2 text-left">Customer</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Amount</th>
                <th className="py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.order_id} className="border-b last:border-b-0 hover:bg-gray-50 transition group">
                  <td className="py-3 font-mono text-xs text-gray-700 group-hover:text-green-700 transition">
                    #{order.order_id}
                  </td>
                  <td className="py-3 font-medium text-gray-900 group-hover:text-green-700 transition">
                    {order.customer_name}
                  </td>
                  <td className="py-3 text-gray-500">{formatDate(order.created_at)}</td>
                  <td className="py-3 font-semibold text-green-700">
                    Rs {order.total_amount?.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${statusStyles[order.status?.toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          No recent orders
        </div>
      )}
    </div>
  );
};

export default RecentInvoiceTable;
