import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchShops, addShopRequest } from '../../../api/Shop'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Shop Detail Modal
const ShopDetailModal = ({ shop, onClose }) => {
  if (!shop) return null
  const hasLocation = shop.lat && shop.lng

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {shop.business_name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{shop.business_name}</h2>
              <p className="text-sm text-gray-500 mt-1">Owner: {shop.owner_name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {shop.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{shop.description}</p>
            </div>
          )}

          {hasLocation && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Map Location</h3>
              <div className="rounded-xl overflow-hidden border border-gray-200 h-80">
                <MapContainer center={[shop.lat, shop.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[shop.lat, shop.lng]}>
                    <Popup>{shop.business_name}</Popup>
                  </Marker>
                </MapContainer>
              </div>
              <p className="mt-2 text-xs text-gray-500">Coordinates: {shop.lat.toFixed(6)}, {shop.lng.toFixed(6)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button 
            onClick={onClose}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Shop Card
const ShopCard = ({ shop, onViewDetails, onViewProducts, handleAddShop }) => {
  const initial = shop.business_name ? shop.business_name[0].toUpperCase() : 'S'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 truncate group-hover:text-indigo-600 transition">{shop.business_name}</h3>
          <p className="text-sm text-gray-500 mt-1">Owner: {shop.owner_name}</p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-4 border-t border-gray-100 gap-2">
        <button 
          onClick={() => onViewDetails(shop)}
          className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition"
        >
          View Details
        </button>
        <button 
          onClick={() => onViewProducts(shop)}
          className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition"
        >
          View Products
        </button>

        {/* Connection status */}
        {shop.connection_status === 'none' && (
          <button
            onClick={() => handleAddShop(shop.id)}
            className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition"
          >
            Add Shop
          </button>
        )}
        {shop.connection_status === 'pending' && (
          <span className="px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 text-sm font-semibold">
            Pending
          </span>
        )}
        {shop.connection_status === 'accepted' && (
          <span className="px-4 py-2 rounded-lg bg-green-100 text-green-800 text-sm font-semibold">
            Added
          </span>
        )}
        {shop.connection_status === 'rejected' && (
          <span className="px-4 py-2 rounded-lg bg-red-100 text-red-800 text-sm font-semibold">
            Rejected
          </span>
        )}
      </div>
    </div>
  )
}

// Main Shop Page
const Shop = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedShop, setSelectedShop] = useState(null)

  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shops', page, search],
    queryFn: () => fetchShops(page, search),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000
  })

  const mutation = useMutation({
    mutationFn: (businessId) => addShopRequest(businessId),
    onSuccess: () => queryClient.invalidateQueries(['shops']),
    onError: (error) => alert(error.message)
  })

  const handleAddShop = (businessId) => mutation.mutate(businessId)

  const handleViewProducts = (shop) => {
    navigate(`/shops/${shop.id}/products`)
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (isError) return <div className="min-h-screen flex items-center justify-center">Error fetching shops.</div>

  const shops = data?.results || []
  const totalPages = data?.count ? Math.ceil(data.count / 10) : 1

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {selectedShop && <ShopDetailModal shop={selectedShop} onClose={() => setSelectedShop(null)} />}

      <div className="container mx-auto px-4 lg:px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Shops</h1>
          <p className="text-gray-600">Browse through our collection of amazing local businesses</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8 relative">
          <input
            type="text"
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map(shop => (
            <ShopCard
              key={shop.id}
              shop={shop}
              onViewDetails={setSelectedShop}
              onViewProducts={handleViewProducts}
              handleAddShop={handleAddShop}
            />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <button disabled={!data?.previous} onClick={() => setPage(old => Math.max(old - 1, 1))}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={!data?.next} onClick={() => setPage(old => old + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}

export default Shop
