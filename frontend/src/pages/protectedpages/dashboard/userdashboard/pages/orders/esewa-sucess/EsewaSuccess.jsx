import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { FiCheckCircle, FiLoader } from 'react-icons/fi'

const EsewaSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [paymentData, setPaymentData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eSewa V2 returns data as base64 encoded JSON
    const encodedData = searchParams.get('data')
    
    if (encodedData) {
      try {
        const decoded = atob(encodedData)
        const data = JSON.parse(decoded)
        setPaymentData(data)
        console.log('eSewa Success Payment Data:', data)
      } catch (err) {
        console.error('Error decoding eSewa data:', err)
      }
    }
    
    setLoading(false)
  }, [searchParams])

  const handleViewOrders = () => {
    navigate('/dashboard/customer/orders')
  }

  const handleContinueShopping = () => {
    navigate('/dashboard/customer/shops')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your eSewa payment has been processed successfully.
        </p>

        {paymentData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-700 mb-2">Transaction Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Transaction ID:</span> {paymentData.transaction_uuid}</p>
              <p><span className="text-gray-500">Amount:</span> Rs. {paymentData.total_amount}</p>
              <p><span className="text-gray-500">Status:</span> <span className="text-green-600 font-medium">{paymentData.status}</span></p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleViewOrders}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            View Orders
          </button>
          <button
            onClick={handleContinueShopping}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}

export default EsewaSuccess