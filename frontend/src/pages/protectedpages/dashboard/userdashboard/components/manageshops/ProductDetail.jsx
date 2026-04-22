import React, { useEffect, useState } from 'react'
import { fetchProductDetailByShop } from '../../../../../../api/Products'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"

const ProductDetail = ({ productId, shopId }) => {
  const [prodDetail, setProdDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const handleProductDetail = async (productId, shopId) => {
    try {
      const response = await fetchProductDetailByShop(shopId, productId)
      console.log("This is response", response)
      setProdDetail(response)
    } catch (err) {
      console.log("This is error", err.message)
      setError("Failed to load product")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleProductDetail(productId, shopId)
  }, [productId, shopId])

  if (loading) return <div className="p-6">Loading product...</div>
  if (error) return <div className="p-6 text-red-500">{error}</div>
  if (!prodDetail) return null

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Product Detail</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* LEFT — Product Image */}
        <div className="md:w-1/2 bg-white p-4 rounded-lg shadow">
          <img
            src={`${BACKEND_URL}${prodDetail.image}`}
            alt={prodDetail.name}
            className="w-full h-auto rounded-lg object-contain"
          />
        </div>

        {/* RIGHT — Product Info */}
        <div className="md:w-1/2 space-y-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{prodDetail.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Category: {prodDetail.category_name}</p>
          </div>

          <p className="text-gray-700 leading-relaxed">
            {prodDetail.description}
          </p>

          <div className="text-2xl font-semibold text-green-600">
            Rs {prodDetail.selling_price}
          </div>

          <div className="text-sm">
            {prodDetail.stock > 0 ? (
              <span className="text-green-600 font-medium">In Stock ({prodDetail.stock})</span>
            ) : (
              <span className="text-red-500 font-medium">Out of Stock</span>
            )}
          </div>

          <button
            disabled={prodDetail.stock === 0}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
