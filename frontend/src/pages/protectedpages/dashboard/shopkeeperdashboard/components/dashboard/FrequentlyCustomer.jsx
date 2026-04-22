import React from 'react'

const frequentlyCustomers = [
  { name: 'John Doe', visits: 15, totalSpent: 1200.50 },
  { name: 'Jane Smith', visits: 12, totalSpent: 980.75 },
  { name: 'Alice Johnson', visits: 10, totalSpent: 850.00 },
]

const avatarColors = ['bg-indigo-100 text-indigo-700', 'bg-pink-100 text-pink-700', 'bg-green-100 text-green-700']

const FrequentlyCustomer = () => (
  <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
    <h2 className="text-lg font-semibold mb-4 text-gray-900">Frequently Visited Customers</h2>
    <ul className="divide-y divide-gray-100">
      {frequentlyCustomers.map((customer, index) => (
        <li key={index} className="flex items-center gap-4 py-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${avatarColors[index % avatarColors.length]}`}>{customer.name[0]}</div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{customer.name}</div>
            <div className="text-xs text-gray-500">Visits: <span className="font-semibold text-indigo-600">{customer.visits}</span></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Total Spent</div>
            <div className="font-bold text-green-600">Rs {customer.totalSpent.toFixed(2)}</div>
          </div>
        </li>
      ))}
    </ul>
  </div>
)

export default FrequentlyCustomer