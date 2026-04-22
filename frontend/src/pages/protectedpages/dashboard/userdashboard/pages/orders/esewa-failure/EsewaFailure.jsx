import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiXCircle } from 'react-icons/fi'

const EsewaFailure = () => {
  const navigate = useNavigate()

  const handleTryAgain = () => {
    navigate(-1) // Go back to checkout
  }

  const handleViewOrders = () => {
    navigate('/dashboard/customer/orders')
  }

  const handleContinueShopping = () => {
    navigate('/dashboard/customer/shops')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiXCircle className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          Your eSewa payment could not be processed. This could be due to insufficient balance, 
          cancelled transaction, or a technical issue.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> If money was deducted from your account, it will be refunded 
            within 24-48 hours.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleTryAgain}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Try Again
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleViewOrders}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              View Orders
            </button>
            <button
              onClick={handleContinueShopping}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Browse Shops
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EsewaFailure