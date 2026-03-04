import React from "react";

/**
 * ViewProduct Modal Component
 * Displays detailed view of a product
 */
const ViewProduct = ({ product, onClose, onEdit, onDelete }) => {
  if (!product) return null;

  const statusFromStock = (stock) => {
    if (stock === 0) return { label: "Out of Stock", cls: "bg-red-100 text-red-700" };
    if (stock < 10) return { label: "Low Stock", cls: "bg-yellow-100 text-yellow-700" };
    return { label: "In Stock", cls: "bg-green-100 text-green-700" };
  };

  const status = statusFromStock(product.stock);
  const profit = Number(product.selling_price) - Number(product.cost_price);
  const profitMargin = ((profit / Number(product.cost_price)) * 100).toFixed(1);

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{product.name}</h2>
          <p className="text-sm text-gray-500">Product ID: #{product.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {/* Image */}
      <div className="mb-4">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg border"
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Category</div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            {product.category_name || "Uncategorized"}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Stock</div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            {product.stock} units
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Cost Price</div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            Rs {Number(product.cost_price).toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Selling Price</div>
          <div className="text-sm font-medium text-indigo-600 mt-1">
            Rs {Number(product.selling_price).toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Profit/Unit</div>
          <div className={`text-sm font-medium mt-1 ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            Rs {profit.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Profit Margin</div>
          <div className={`text-sm font-medium mt-1 ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {profitMargin}%
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</div>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
            {product.description}
          </p>
        </div>
      )}

      {/* Stock Progress Bar */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Stock Level</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                product.stock === 0
                  ? "bg-gray-400"
                  : product.stock < 10
                  ? "bg-yellow-500"
                  : product.stock < 50
                  ? "bg-blue-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(product.stock, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{product.stock}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Close
        </button>

        <button
          onClick={() => onEdit && onEdit(product)}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Edit
        </button>

        <button
          onClick={() => onDelete && onDelete(product)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ViewProduct;
