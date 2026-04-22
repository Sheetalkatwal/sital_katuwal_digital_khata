import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { fetchCustomerAnalytics, fetchConnectedShops } from '../../../../../../api/Dashboard'
import { FiLoader, FiTrendingUp, FiShoppingBag, FiCreditCard, FiDollarSign } from 'react-icons/fi'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const METRICS = [
  { key: 'top_products', label: 'Top Products by Spending' },
  { key: 'spending_by_shop', label: 'Spending by Shop' },
  { key: 'order_status', label: 'Order Status Breakdown' },
]

const CustomerAnalytics = () => {
  const [metric, setMetric] = useState('top_products')
  const [period, setPeriod] = useState('all')

  // Fetch connected shops for filter
  const { data: shopsData } = useQuery({
    queryKey: ['connectedShops'],
    queryFn: fetchConnectedShops,
  })

  // Fetch analytics data
  const { data: analyticsData, isLoading, isError, error } = useQuery({
    queryKey: ['customerAnalytics', period],
    queryFn: () => fetchCustomerAnalytics({ period: period === 'all' ? undefined : period }),
  })

  const shops = shopsData?.shops || []
  const connectedShopsCount = analyticsData?.connected_shops_count ?? shops.length
  const totalSpent = analyticsData?.total_spent ?? 0
  const topProducts = analyticsData?.top_products || []
  const spendingByShop = analyticsData?.spending_by_shop || []
  const statusBreakdown = analyticsData?.status_breakdown || []
  const loanSummary = analyticsData?.loan_summary || { total_borrowed: 0, total_paid: 0, outstanding: 0 }

  // Chart data based on selected metric
  const chartData = useMemo(() => {
    if (metric === 'top_products') {
      return {
        labels: topProducts.map(p => p.product__name || 'Unknown'),
        datasets: [{
          label: 'Total Spent (Rs)',
          data: topProducts.map(p => parseFloat(p.total_spent || 0)),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        }]
      }
    }

    if (metric === 'spending_by_shop') {
      return {
        labels: spendingByShop.map(s => s.business__business_name || 'Unknown'),
        datasets: [{
          label: 'Total Spent (Rs)',
          data: spendingByShop.map(s => parseFloat(s.total_spent || 0)),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        }]
      }
    }

    if (metric === 'order_status') {
      const colors = {
        pending: '#FCD34D',
        confirmed: '#60A5FA',
        shipped: '#A78BFA',
        delivered: '#34D399',
        completed: '#10B981',
        cancelled: '#EF4444',
        paid: '#14B8A6',
        failed: '#F87171',
      }
      return {
        labels: statusBreakdown.map(s => s.status?.charAt(0).toUpperCase() + s.status?.slice(1)),
        datasets: [{
          data: statusBreakdown.map(s => s.count),
          backgroundColor: statusBreakdown.map(s => colors[s.status] || '#9CA3AF'),
        }]
      }
    }

    return { labels: [], datasets: [] }
  }, [metric, topProducts, spendingByShop, statusBreakdown])

  // Table rows based on metric
  const tableRows = useMemo(() => {
    if (metric === 'top_products') {
      return topProducts.map(p => ({
        name: p.product__name || 'Unknown',
        value: `Rs ${parseFloat(p.total_spent || 0).toLocaleString()}`,
        secondary: `${p.total_quantity || 0} items`
      }))
    }

    if (metric === 'spending_by_shop') {
      return spendingByShop.map(s => ({
        name: s.business__business_name || 'Unknown',
        value: `Rs ${parseFloat(s.total_spent || 0).toLocaleString()}`,
        secondary: `${s.order_count || 0} orders`
      }))
    }

    if (metric === 'order_status') {
      return statusBreakdown.map(s => ({
        name: s.status?.charAt(0).toUpperCase() + s.status?.slice(1),
        value: s.count,
        secondary: ''
      }))
    }

    return []
  }, [metric, topProducts, spendingByShop, statusBreakdown])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading analytics: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Customer Analytics</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value)} 
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>

          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)} 
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="all">All time</option>
            <option value="month">This month</option>
            <option value="year">This year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FiShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Connected Shops</div>
              <div className="text-xl font-semibold">{connectedShopsCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Spent</div>
              <div className="text-xl font-semibold">
                Rs {totalSpent.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <FiCreditCard className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Outstanding Loan</div>
              <div className="text-xl font-semibold text-red-600">
                Rs {loanSummary.outstanding.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Paid</div>
              <div className="text-xl font-semibold text-teal-600">
                Rs {loanSummary.total_paid.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {METRICS.find(m => m.key === metric)?.label}
          </h3>
          {metric === 'order_status' ? (
            <div className="max-w-md mx-auto">
              <Doughnut 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  plugins: { legend: { position: 'bottom' } } 
                }} 
              />
            </div>
          ) : (
            <Bar 
              data={chartData} 
              options={{ 
                responsive: true, 
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }} 
            />
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Top Results</h3>
          <div className="space-y-3">
            {tableRows.length > 0 ? tableRows.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.name}</div>
                  {r.secondary && <div className="text-xs text-gray-500">{r.secondary}</div>}
                </div>
                <div className="text-sm font-semibold text-gray-700">{r.value}</div>
              </div>
            )) : (
              <div className="text-sm text-gray-500">No data for selected filter</div>
            )}
          </div>
        </div>
      </div>

      {/* Connected Shops List */}
      {shops.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Connected Shops</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map(shop => (
              <div key={shop.id} className="border border-gray-200 rounded-lg p-3">
                <div className="font-medium text-gray-800">{shop.name}</div>
                <div className="text-sm text-gray-500">{shop.address || 'No address'}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Connected since {new Date(shop.connected_since).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerAnalytics