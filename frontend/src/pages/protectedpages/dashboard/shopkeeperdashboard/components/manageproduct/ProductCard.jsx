import React from 'react'

const statusFromStock = (stock) => {
  if (stock === 0) return { label: 'Out of Stock', cls: 'bg-red-100 text-red-700' }
  if (stock < 10) return { label: 'Low', cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Active', cls: 'bg-green-100 text-green-700' }
}

export default function ProductCard({ p, onView = () => {}, onEdit = () => {}, onDelete = () => {} }) {
  const status = statusFromStock(p.stock)
  const imgSrc = p.image ? p.image : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition">
      {/* Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-gray-900 text-base line-clamp-2">{p.name}</div>
        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${status.cls}`}>{status.label}</span>
      </div>

      <div className="text-xs text-gray-500">Category: {p.category_name || 'Uncategorized'}</div>

      {/* Image */}
      {imgSrc ? (
        <img src={imgSrc} alt={p.name} className="w-full h-40 object-cover rounded-md border" />
      ) : (
        <div className="w-full h-40 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm">No Image</div>
      )}

      {/* Description */}
      <div className="text-xs text-gray-600 line-clamp-2">{p.description || 'No description'}</div>

      {/* Prices */}
      <div className="flex justify-between text-sm mt-1">
        <div>
          <div className="text-gray-400 text-xs">Cost</div>
          <div className="font-semibold text-gray-900">Rs {Number(p.cost_price).toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs">Selling</div>
          <div className="font-semibold text-indigo-600">Rs {Number(p.selling_price).toLocaleString()}</div>
        </div>
      </div>

      {/* Stock bar */}
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-2 rounded bg-gray-200 overflow-hidden">
          <div
            className={`h-2 rounded ${p.stock === 0 ? 'bg-gray-400' : p.stock < 10 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(p.stock, 100)}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{p.stock} in stock</span>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">ID #{p.id}</span>

        <div className="flex gap-1">
          <button
            onClick={() => onView(p)}
            className="px-2.5 py-1.5 rounded bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition"
          >
            View
          </button>
          <button
            onClick={() => onEdit(p)}
            className="px-2.5 py-1.5 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
