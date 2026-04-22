import React from "react"
import { useQuery } from "@tanstack/react-query"
import { Bar } from "react-chartjs-2"
import { motion } from "framer-motion"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { fetchCustomerDashboard } from "../../../../../../api/Dashboard"
import { FiLoader, FiShoppingBag, FiDollarSign, FiCreditCard, FiAlertCircle, FiPackage } from "react-icons/fi"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const DashboardPage = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customerDashboard"],
    queryFn: fetchCustomerDashboard,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <FiAlertCircle className="w-12 h-12 mb-4" />
        <p>Error loading dashboard: {error.message}</p>
      </div>
    )
  }

  const stats = [
    { 
      title: "Connected Shops", 
      value: data?.connected_shops || 0, 
      icon: FiShoppingBag,
      color: "bg-blue-100 text-blue-600"
    },
    { 
      title: "Total Orders", 
      value: data?.total_orders || 0, 
      icon: FiPackage,
      color: "bg-green-100 text-green-600"
    },
    { 
      title: "Total Spent", 
      value: `Rs ${(data?.total_spent || 0).toLocaleString()}`, 
      icon: FiDollarSign,
      color: "bg-purple-100 text-purple-600"
    },
    { 
      title: "Pending Orders", 
      value: data?.pending_orders || 0, 
      icon: FiPackage,
      color: "bg-yellow-100 text-yellow-600"
    },
    { 
      title: "Outstanding Loans", 
      value: `Rs ${(data?.outstanding_loans || 0).toLocaleString()}`, 
      icon: FiCreditCard,
      color: "bg-red-100 text-red-600"
    },
  ]

  // Chart data from API
  const monthlySpending = data?.monthly_spending || []
  const chartData = {
    labels: monthlySpending.map(m => m.month),
    datasets: [
      {
        label: "Monthly Spending",
        data: monthlySpending.map(m => m.amount),
        backgroundColor: "rgba(34, 197, 94, 0.8)",
        borderRadius: 6,
      },
    ],
  }

  const recentOrders = data?.recent_orders || []

  return (
    <div className="space-y-6">
      <motion.h2 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-semibold text-gray-800"
      >
        Dashboard
      </motion.h2>

      {/* Summary Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            variants={cardVariants}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center justify-center"
          >
            <div className={`p-3 rounded-full ${s.color} mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1 text-center">{s.title}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Spending Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-5 shadow-sm rounded-xl border border-gray-100 lg:col-span-2"
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">Spending Overview</h3>
          {monthlySpending.length > 0 ? (
            <Bar 
              data={chartData} 
              options={{ 
                responsive: true, 
                plugins: { 
                  legend: { display: false } 
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `Rs ${value.toLocaleString()}`
                    }
                  }
                }
              }} 
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No spending data available
            </div>
          )}
        </motion.div>

        {/* Recent Orders */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-5 shadow-sm rounded-xl border border-gray-100"
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">Recent Orders</h3>
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order, idx) => (
                <div key={order.order_id || idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">Order #{order.order_id}</div>
                    <div className="text-sm text-gray-500">{order.shop_name}</div>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">Rs {order.total_amount?.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              No recent orders
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}

export default DashboardPage
