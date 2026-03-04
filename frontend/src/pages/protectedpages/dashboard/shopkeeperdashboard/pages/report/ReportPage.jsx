import React, { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { fetchShopkeeperDashboard, fetchShopkeeperAnalytics, fetchConnectedCustomers } from '../../../../../../api/Dashboard'
import { FiLoader, FiDownload, FiPrinter, FiUsers, FiPackage, FiTrendingUp, FiAlertCircle, FiDollarSign } from 'react-icons/fi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

const formatNumber = v => Number(v).toLocaleString()

const ReportPage = () => {
  const [period, setPeriod] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const reportRef = useRef()

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['shopkeeperDashboard'],
    queryFn: fetchShopkeeperDashboard,
  })

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['shopkeeperAnalytics', period],
    queryFn: () => fetchShopkeeperAnalytics({ period: period === 'all' ? undefined : period }),
  })

  // Fetch connected customers
  const { data: customersData } = useQuery({
    queryKey: ['connectedCustomers'],
    queryFn: () => fetchConnectedCustomers(),
  })

  const isLoading = dashboardLoading || analyticsLoading

  const dashboard = dashboardData || {}
  const analytics = analyticsData || {}
  const customers = customersData?.customers || []

  const topProducts = analytics.top_products || []
  const topCustomers = analytics.top_customers || []
  const topDebtors = analytics.top_debtors || []
  const statusBreakdown = analytics.status_breakdown || []
  const paymentBreakdown = analytics.payment_breakdown || []
  const monthlyRevenue = dashboard.monthly_revenue || []
  const recentOrders = dashboard.recent_orders || []

  // Revenue chart data
  const revenueChartData = useMemo(() => ({
    labels: monthlyRevenue.map(m => m.month),
    datasets: [{
      label: 'Revenue (Rs)',
      data: monthlyRevenue.map(m => m.amount),
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderColor: 'rgba(34, 197, 94, 1)',
      tension: 0.3,
      fill: true,
    }]
  }), [monthlyRevenue])

  // Top products chart
  const productsChartData = useMemo(() => ({
    labels: topProducts.map(p => p.product__name || 'Unknown'),
    datasets: [{
      label: 'Qty Sold',
      data: topProducts.map(p => p.total_sold || 0),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
    }]
  }), [topProducts])

  // Payment method chart
  const paymentChartData = useMemo(() => {
    const colors = {
      cash: '#10B981',
      esewa: '#22C55E',
      card: '#3B82F6',
      credit: '#EF4444',
    }
    return {
      labels: paymentBreakdown.map(p => p.payment_method?.charAt(0).toUpperCase() + p.payment_method?.slice(1)),
      datasets: [{
        data: paymentBreakdown.map(p => p.count),
        backgroundColor: paymentBreakdown.map(p => colors[p.payment_method] || '#9CA3AF'),
      }]
    }
  }, [paymentBreakdown])

  // Order status chart
  const statusChartData = useMemo(() => {
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
  }, [statusBreakdown])

  // CSV Export helper
  const exportCSV = (rows, filename = 'report.csv') => {
    if (!rows || !rows.length) {
      alert('No rows to export')
      return
    }
    const keys = Object.keys(rows[0])
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] ?? '')}"`).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  // PDF export helper (print window)
  const exportPDF = () => {
    const html = `
      <html><head><title>Report</title>
        <style>body{font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:20px}</style>
      </head><body>${reportRef.current ? reportRef.current.innerHTML : '<div>No content</div>'}</body></html>`
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { alert('Please allow popups to export PDF'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading reports...</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales & Customer Report</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of sales, profit/loss, top products and top customers.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)} 
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button 
            onClick={() => exportCSV(topProducts.map(p => ({ 
              product: p.product__name, 
              sold: p.total_sold, 
              revenue: p.total_revenue 
            })), 'top-products.csv')} 
            className="px-3 py-2 bg-gray-100 rounded text-sm flex items-center gap-1 hover:bg-gray-200"
          >
            <FiDownload className="w-4 h-4" /> CSV
          </button>
          <button 
            onClick={exportPDF} 
            className="px-3 py-2 bg-gray-800 text-white rounded text-sm flex items-center gap-1 hover:bg-gray-700"
          >
            <FiPrinter className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div ref={reportRef}>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiDollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Revenue</div>
                <div className="text-xl font-semibold">Rs {formatNumber(Math.round(dashboard.total_revenue || 0))}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FiUsers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Customers</div>
                <div className="text-xl font-semibold">{dashboard.total_customers || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <FiPackage className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Orders</div>
                <div className="text-xl font-semibold">{dashboard.total_orders || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Outstanding</div>
                <div className="text-xl font-semibold text-red-600">Rs {formatNumber(Math.round(dashboard.outstanding_receivables || 0))}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Revenue Over Time</h3>
            <Line 
              data={revenueChartData} 
              options={{ 
                responsive: true, 
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }} 
            />
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Top Products</h3>
            <Bar 
              data={productsChartData} 
              options={{ 
                indexAxis: 'y', 
                responsive: true,
                plugins: { legend: { display: false } }
              }} 
            />
          </div>
        </div>

        {/* Payment & Status Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Payment Methods</h3>
            <div className="max-w-xs mx-auto">
              <Doughnut 
                data={paymentChartData} 
                options={{ 
                  responsive: true, 
                  plugins: { legend: { position: 'bottom' } } 
                }} 
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Order Status</h3>
            <div className="max-w-xs mx-auto">
              <Doughnut 
                data={statusChartData} 
                options={{ 
                  responsive: true, 
                  plugins: { legend: { position: 'bottom' } } 
                }} 
              />
            </div>
          </div>
        </div>

        {/* Top Customers & Debtors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Top Customers by Spending</h3>
              <button 
                onClick={() => exportCSV(topCustomers.map(c => ({
                  name: `${c.customer__user__first_name || ''} ${c.customer__user__last_name || ''}`.trim(),
                  spent: c.total_spent,
                  orders: c.order_count
                })), 'top-customers.csv')}
                className="text-sm text-blue-600 hover:underline"
              >
                Export
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Orders</th>
                  <th className="py-2 text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-500">No data</td></tr>
                ) : topCustomers.map((c, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2">
                      {`${c.customer__user__first_name || ''} ${c.customer__user__last_name || ''}`.trim() || 'Unknown'}
                    </td>
                    <td className="py-2">{c.order_count}</td>
                    <td className="py-2 text-right font-medium">Rs {formatNumber(c.total_spent || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-red-600">Top Debtors (Outstanding)</h3>
              <button 
                onClick={() => exportCSV(topDebtors.map(d => ({
                  name: `${d.customer__user__first_name || ''} ${d.customer__user__last_name || ''}`.trim(),
                  due: d.total_due
                })), 'top-debtors.csv')}
                className="text-sm text-blue-600 hover:underline"
              >
                Export
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2">Customer</th>
                  <th className="py-2 text-right">Outstanding Due</th>
                </tr>
              </thead>
              <tbody>
                {topDebtors.length === 0 ? (
                  <tr><td colSpan={2} className="py-4 text-center text-gray-500">No outstanding dues</td></tr>
                ) : topDebtors.map((d, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2">
                      {`${d.customer__user__first_name || ''} ${d.customer__user__last_name || ''}`.trim() || 'Unknown'}
                    </td>
                    <td className="py-2 text-right font-medium text-red-600">Rs {formatNumber(d.total_due || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Recent Orders</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b">
                <th className="py-2">Order ID</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No recent orders</td></tr>
              ) : recentOrders.map((o, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2">#{o.order_id}</td>
                  <td className="py-2">{o.customer_name}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      o.status === 'completed' ? 'bg-green-100 text-green-700' :
                      o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-2 text-right font-medium">Rs {formatNumber(o.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportPage