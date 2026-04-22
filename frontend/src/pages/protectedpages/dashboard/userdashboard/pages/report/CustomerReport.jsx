import React, { useMemo, useRef, useState } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

// Dummy data generator
const PRODUCTS = [
  { id: 1, name: 'Classic T-Shirt', stock: 120 },
  { id: 2, name: 'Running Shoes', stock: 40 },
  { id: 3, name: 'Wireless Earbuds', stock: 18 },
  { id: 4, name: 'Coffee Mug', stock: 400 },
  { id: 5, name: 'Backpack', stock: 25 },
]

const CUSTOMERS = [
  { id: 1, name: 'Asha Gurung' },
  { id: 2, name: 'Ramesh Thapa' },
  { id: 3, name: 'Sita Rai' },
  { id: 4, name: 'Kiran Shrestha' },
]

// Example sales records: {date, productId, customerId, qty, price, cost}
const SAMPLE_SALES = (() => {
  const rows = []
  const start = new Date()
  // create last 90 days sample
  for (let i = 0; i < 90; i++){
    const d = new Date(start)
    d.setDate(start.getDate() - i)
    // random few sales per day
    const count = Math.floor(Math.random()*3)
    for (let j=0;j<count;j++){
      const prod = PRODUCTS[Math.floor(Math.random()*PRODUCTS.length)]
      const cust = CUSTOMERS[Math.floor(Math.random()*CUSTOMERS.length)]
      const qty = Math.floor(Math.random()*3)+1
      const price = (prod.id * 200) + Math.floor(Math.random()*500)
      const cost = Math.floor(price * 0.7)
      rows.push({ date: d.toISOString().slice(0,10), productId: prod.id, customerId: cust.id, qty, price, cost })
    }
  }
  return rows
})()

const periods = ['week','month','year','custom']

const formatNumber = v => v.toLocaleString()

const CustomerReport = () => {
  const [period, setPeriod] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const reportRef = useRef()

  // filter data according to period
  const filtered = useMemo(()=>{
    const now = new Date()
    let from = new Date()
    if (period === 'week') from.setDate(now.getDate() - 7)
    else if (period === 'month') from.setMonth(now.getMonth() - 1)
    else if (period === 'year') from.setFullYear(now.getFullYear() - 1)
    else if (period === 'custom') from = customFrom ? new Date(customFrom) : new Date('1970-01-01')
    const to = period === 'custom' ? (customTo ? new Date(customTo) : new Date()) : now
    return SAMPLE_SALES.filter(r => {
      const d = new Date(r.date)
      return d >= from && d <= to
    })
  }, [period, customFrom, customTo])

  const metrics = useMemo(()=>{
    const totalSales = filtered.reduce((s,r)=> s + (r.price * r.qty), 0)
    const totalCost = filtered.reduce((s,r)=> s + (r.cost * r.qty), 0)
    const profit = totalSales - totalCost

    // top product sold
    const productMap = {}
    filtered.forEach(r => {
      productMap[r.productId] = productMap[r.productId] || { qty:0, revenue:0 }
      productMap[r.productId].qty += r.qty
      productMap[r.productId].revenue += r.price * r.qty
    })
    const topProducts = Object.keys(productMap).map(pid => ({ product: PRODUCTS.find(p=>p.id==pid), ...productMap[pid] })).sort((a,b)=> b.qty - a.qty)

    // top customers
    const customerMap = {}
    filtered.forEach(r => {
      customerMap[r.customerId] = customerMap[r.customerId] || { qty:0, revenue:0 }
      customerMap[r.customerId].qty += r.qty
      customerMap[r.customerId].revenue += r.price * r.qty
    })
    const topCustomers = Object.keys(customerMap).map(cid => ({ customer: CUSTOMERS.find(c=>c.id==cid), ...customerMap[cid] })).sort((a,b)=> b.revenue - a.revenue)

    return { totalSales, totalCost, profit, topProducts, topCustomers }
  }, [filtered])

  // comparison to previous same-length period
  const comparison = useMemo(()=>{
    const now = new Date()
    let from = new Date()
    if (period === 'week') from.setDate(now.getDate() - 7)
    else if (period === 'month') from.setMonth(now.getMonth() - 1)
    else if (period === 'year') from.setFullYear(now.getFullYear() - 1)
    else if (period === 'custom') from = customFrom ? new Date(customFrom) : new Date('1970-01-01')
    const to = period === 'custom' ? (customTo ? new Date(customTo) : new Date()) : now
    // previous period same length
    const len = (to - from)
    const prevTo = new Date(from.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - len)

    const prev = SAMPLE_SALES.filter(r=>{
      const d = new Date(r.date)
      return d >= prevFrom && d <= prevTo
    })
    const prevTotalSales = prev.reduce((s,r)=> s + (r.price * r.qty), 0)
    return { prevTotalSales }
  }, [period, customFrom, customTo])

  // chart data (sales over time aggregated by day)
  const chartData = useMemo(()=>{
    // keys by date
    const map = {}
    filtered.forEach(r => { map[r.date] = (map[r.date]||0) + (r.price * r.qty) })
    const keys = Object.keys(map).sort()
    return {
      labels: keys,
      datasets: [ { label: 'Sales', data: keys.map(k=>map[k]), backgroundColor: '#34D399', borderColor: '#059669', tension:0.3 } ]
    }
  }, [filtered])

  const exportCSV = (rows, filename='report.csv') => {
    if (!rows || !rows.length) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k=>`"${String(r[k] ?? '')}"`).join(','))).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    // open printable window with the report content
    const html = `
      <html><head><title>Report</title>
        <style>body{font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:20px}</style>
      </head><body>${reportRef.current ? reportRef.current.innerHTML : '<div>No content</div>'}</body></html>`
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { alert('Please allow popups to export PDF'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    // wait then print
    setTimeout(()=> w.print(), 500)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Sales & Customer Report</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of sales, profit/loss, top products and top customers (dummy data).</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="border rounded px-3 py-2 text-sm">
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {period === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="border rounded px-2 py-2 text-sm" />
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="border rounded px-2 py-2 text-sm" />
            </>
          )}
          <button onClick={() => exportCSV(metrics.topProducts.map(tp=>({product: tp.product.name, qty: tp.qty, revenue: tp.revenue})), 'top-products.csv')} className="px-3 py-2 bg-gray-100 rounded text-sm">Export CSV</button>
          <button onClick={exportPDF} className="px-3 py-2 bg-gray-800 text-white rounded text-sm">Export PDF</button>
        </div>
      </div>

      <div ref={reportRef}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Total sales</div>
            <div className="text-xl font-semibold mt-1">Rs {formatNumber(Math.round(metrics.totalSales))}</div>
            <div className="text-xs text-gray-500 mt-1">Prev period: Rs {formatNumber(Math.round(comparison.prevTotalSales || 0))}</div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Profit / Loss</div>
            <div className={`text-xl font-semibold mt-1 ${metrics.profit>=0 ? 'text-green-600' : 'text-red-600'}`}>Rs {formatNumber(Math.round(metrics.profit))}</div>
            <div className="text-xs text-gray-500 mt-1">Compared to previous: { ((metrics.totalSales - (comparison.prevTotalSales||0)) / Math.max(1, (comparison.prevTotalSales||1)) * 100).toFixed(1) }%</div>
          </div>
          <div className="bg-white rounded shadow p-4">
            <div className="text-sm text-gray-500">Top product</div>
            {metrics.topProducts[0] ? (
              <div>
                <div className="text-lg font-semibold mt-1">{metrics.topProducts[0].product.name}</div>
                <div className="text-xs text-gray-500 mt-1">Sold: {metrics.topProducts[0].qty} — Stock: {metrics.topProducts[0].product.stock}</div>
              </div>
            ) : <div className="text-sm text-gray-500 mt-2">No sales</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold mb-2">Sales over time</h3>
            <Line data={chartData} options={{ responsive:true, plugins:{ legend:{ display:false } } }} />
          </div>

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold mb-2">Top products</h3>
            <Bar data={{ labels: metrics.topProducts.map(tp=>tp.product.name), datasets:[{ label:'Qty sold', data: metrics.topProducts.map(tp=>tp.qty), backgroundColor:'#60A5FA' }] }} options={{ indexAxis:'y', responsive:true }} />
            <div className="mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th>Product</th><th>Sold</th><th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topProducts.map(tp => (
                    <tr key={tp.product.id} className="border-t">
                      <td className="py-2">{tp.product.name}</td>
                      <td className="py-2">{tp.qty}</td>
                      <td className="py-2">{tp.product.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Top customers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500"><th>Customer</th><th>Qty</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {metrics.topCustomers.map(tc => (
                    <tr key={tc.customer.id} className="border-t">
                      <td className="py-2">{tc.customer.name}</td>
                      <td className="py-2">{tc.qty}</td>
                      <td className="py-2">Rs {formatNumber(tc.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-sm text-gray-500">Which customer buys a particular product most?</p>
              <div className="mt-2">
                {metrics.topProducts.slice(0,5).map(tp => {
                  // find customer who bought this product most
                  const byCust = {}
                  filtered.forEach(r => { if (r.productId === tp.product.id) byCust[r.customerId] = (byCust[r.customerId]||0) + r.qty })
                  const bestCustId = Object.keys(byCust).sort((a,b)=> byCust[b]-byCust[a])[0]
                  const bestCust = CUSTOMERS.find(c=>c.id==bestCustId)
                  return (
                    <div key={tp.product.id} className="flex items-center justify-between border p-2 rounded mb-2">
                      <div className="text-sm">{tp.product.name}</div>
                      <div className="text-xs text-gray-600">Top buyer: {bestCust ? bestCust.name : '—' } ({byCust[bestCustId] || 0})</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerReport
