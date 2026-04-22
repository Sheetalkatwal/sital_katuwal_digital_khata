import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Header from "../../../components/Header";
import { fetchProductsByShop } from "../../../api/Products";
import { fetchShopDetail } from "../../../api/Shop";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const listItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const ShopProductsPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // Fetch shop details
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shopDetail", shopId],
    queryFn: () => fetchShopDetail(shopId),
    enabled: !!shopId,
  });

  // Fetch products
  const { data, isLoading, isError } = useQuery({
    queryKey: ["shopProducts", shopId],
    queryFn: () => fetchProductsByShop(shopId),
    enabled: !!shopId,
  });

  const products = data?.results || [];

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category_name).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = products.slice();

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
      );
    }

    if (category) {
      result = result.filter((p) => p.category_name === category);
    }

    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "price_low") {
      result.sort((a, b) => parseFloat(a.selling_price) - parseFloat(b.selling_price));
    } else if (sortBy === "price_high") {
      result.sort((a, b) => parseFloat(b.selling_price) - parseFloat(a.selling_price));
    } else if (sortBy === "stock") {
      result.sort((a, b) => b.stock - a.stock);
    }

    return result;
  }, [products, search, category, sortBy]);

  const handleViewDetail = (product) => {
    navigate(`/shops/${shopId}/products/${product.id}`);
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

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-red-500">Failed to load products. Please try again.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 underline">
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
          <span className="text-gray-900 font-medium">{shop?.business_name || "Shop"}</span>
        </nav>

        {/* Shop Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl">
              {shop?.business_name?.[0]?.toUpperCase() || "S"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{shop?.business_name}</h1>
              <p className="text-gray-500">Owner: {shop?.owner_name}</p>
              {shop?.description && (
                <p className="text-gray-600 mt-2 text-sm">{shop.description}</p>
              )}
            </div>
          </div>

          {/* Connection status badge */}
          <div className="mt-4">
            {shop?.connection_status === "accepted" && (
              <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                ✓ Connected
              </span>
            )}
            {shop?.connection_status === "pending" && (
              <span className="inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                ⏳ Connection Pending
              </span>
            )}
            {shop?.connection_status === "none" && (
              <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                Not Connected
              </span>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2"
            >
              <option value="name">Sort by Name</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="stock">Stock: High to Low</option>
            </select>

            <div className="flex items-center text-gray-600 text-sm">
              {filtered.length} product(s) found
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No products found matching your criteria.
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={listContainer}
          >
            {filtered.map((product) => (
              <motion.div
                key={product.id}
                variants={listItem}
                whileHover={{ y: -4 }}
                onClick={() => handleViewDetail(product)}
                className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition"
              >
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={
                        product.image.startsWith("http")
                          ? product.image
                          : `${BACKEND_URL}${product.image}`
                      }
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-5xl">📦</div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.category_name || "Uncategorized"}
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-lg font-bold text-indigo-600">
                      Rs {parseFloat(product.selling_price).toLocaleString()}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        product.stock > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                    </span>
                  </div>

                  <button className="w-full mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition">
                    View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Back button */}
        <div className="mt-8">
          <button
            onClick={() => navigate("/shops")}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            ← Back to Shops
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopProductsPage;
