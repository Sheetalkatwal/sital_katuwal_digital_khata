import React from 'react'
import { useQuery } from "@tanstack/react-query"
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { fetchShopkeeperDashboard } from "../../../../../../api/Dashboard"
import { FiLoader } from "react-icons/fi"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const options = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `Rs ${ctx.parsed.y.toLocaleString()}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      title: { display: true, text: 'Month' },
    },
    y: {
      grid: { color: '#f3f4f6' },
      title: { display: true, text: 'Revenue (NPR)' },
      beginAtZero: true,
      ticks: {
        callback: (value) => `Rs ${value.toLocaleString()}`,
      },
    },
  },
}

const ChartCard = () => {
  const { data: dashboardData, isLoading, isError } = useQuery({
    queryKey: ["shopkeeperDashboard"],
    queryFn: fetchShopkeeperDashboard,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5 flex items-center justify-center h-80">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5 flex items-center justify-center h-80 text-red-500">
        Failed to load chart data
      </div>
    )
  }

  const monthlyRevenue = dashboardData?.monthly_revenue || []
  
  const chartData = {
    labels: monthlyRevenue.map(m => m.month),
    datasets: [
      {
        label: 'Revenue (NPR)',
        data: monthlyRevenue.map(m => m.amount),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderRadius: 6,
      },
    ],
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-xl flex items-center justify-between shadow border border-gray-100 p-5 mb-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Monthly Revenue</h2>
        <span className="text-sm text-gray-500">Last 6 months</span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
        {monthlyRevenue.length > 0 ? (
          <Bar data={chartData} options={options} height={260} />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            No revenue data available
          </div>
        )}
      </div>
    </div>
  )
}

export default ChartCard