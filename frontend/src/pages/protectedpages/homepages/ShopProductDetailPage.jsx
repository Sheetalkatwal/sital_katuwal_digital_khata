import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Header from "../../../components/Header";
import { fetchProductDetailByShop } from "../../../api/Products";
import { fetchShopDetail } from "../../../api/Shop";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const ShopProductDetailPage = () => {
  const { shopId, productId } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  // Fetch shop details (for connection status)
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shopDetail", shopId],
    queryFn: () => fetchShopDetail(shopId),
    enabled: !!shopId,
  });

  // Fetch product detail
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["productDetail", shopId, productId],
    queryFn: () => fetchProductDetailByShop(shopId, productId),
    enabled: !!shopId && !!productId,
  });

  const isConnected = shop?.connection_status === "accepted";
  const canOrder = isConnected && product?.stock > 0;

  const handleOrderNow = () => {
    if (!canOrder) return;

    // Navigate to checkout or add to cart
    // For now, navigate to dashboard checkout with product info
    navigate("/dashboard/customer/orders/checkout", {
      state: {
        products: [{ ...product, quantity, price: parseFloat(product.selling_price) }],
        shopId,
      },
    });
  };

  const handleAddToCart = () => {
    // TODO: Implement add to cart API call
    console.log("Add to cart:", { product, quantity, shopId });
    alert(`Added ${quantity}x ${product.name} to cart!`);
  };

  if (shopLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-red-500">Failed to load product details. Please try again.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-indigo-600 underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 lg:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link to="/shops" className="hover:text-indigo-600">
            Shops
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/shops/${shopId}/products`} className="hover:text-indigo-600">
            {shop?.business_name || "Shop"}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{product.name}</span>
        </nav>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left - Product Image */}
            <div className="bg-gray-100 flex items-center justify-center min-h-[400px] p-8">
              {product.image ? (
                <motion.img
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  src={
                    product.image.startsWith("http")
                      ? product.image
                      : `${BACKEND_URL}${product.image}`
                  }
                  alt={product.name}
                  className="max-h-96 object-contain rounded-lg"
                />
              ) : (
                <div className="text-gray-300 text-8xl">📦</div>
              )}
            </div>

            {/* Right - Product Info */}
            <div className="p-8 flex flex-col">
              <div className="flex-1">
                {/* Category Badge */}
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4">
                  {product.category_name || "Uncategorized"}
                </span>

                {/* Product Name */}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

                {/* Shop Info */}
                <p className="text-gray-500 mb-4">
                  Sold by{" "}
                  <Link
                    to={`/shops/${shopId}/products`}
                    className="text-indigo-600 hover:underline"
                  >
                    {shop?.business_name}
                  </Link>
                </p>

                {/* Price */}
                <div className="text-4xl font-bold text-indigo-600 mb-4">
                  Rs {parseFloat(product.selling_price).toLocaleString()}
                </div>

                {/* Stock Status */}
                <div className="mb-6">
                  <span
                    className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
                      product.stock > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {product.stock > 0
                      ? `✓ ${product.stock} in stock`
                      : "✕ Out of stock"}
                  </span>
                </div>

                {/* Description */}
                {product.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Section */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                {!isConnected && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 mb-4">
                    <p className="font-medium">⚠️ Connection Required</p>
                    <p className="text-sm mt-1">
                      You need to be connected to this shop to place an order. Go to{" "}
                      <Link to="/shops" className="underline">
                        Shops
                      </Link>{" "}
                      and send a connection request.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <label className="text-gray-700 font-medium">Quantity:</label>
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={!canOrder}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={product.stock || 1}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          Math.max(1, Math.min(product.stock || 1, Number(e.target.value)))
                        )
                      }
                      disabled={!canOrder}
                      className="w-16 text-center border-x border-gray-200 py-2 disabled:opacity-50"
                    />
                    <button
                      onClick={() =>
                        setQuantity((q) => Math.min(product.stock || 1, q + 1))
                      }
                      disabled={!canOrder}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={canOrder ? { scale: 1.02 } : {}}
                    whileTap={canOrder ? { scale: 0.98 } : {}}
                    onClick={handleOrderNow}
                    disabled={!canOrder}
                    className={`px-6 py-4 rounded-xl font-semibold transition ${
                      canOrder
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {canOrder ? "Order Now" : "Cannot Order"}
                  </motion.button>

                  <motion.button
                    whileHover={canOrder ? { scale: 1.02 } : {}}
                    whileTap={canOrder ? { scale: 0.98 } : {}}
                    onClick={handleAddToCart}
                    disabled={!canOrder}
                    className={`px-6 py-4 rounded-xl font-semibold transition ${
                      canOrder
                        ? "bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                        : "bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Add to Cart
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back button */}
        <div className="mt-8">
          <button
            onClick={() => navigate(`/shops/${shopId}/products`)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            ← Back to Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopProductDetailPage;
