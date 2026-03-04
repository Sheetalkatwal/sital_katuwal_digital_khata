import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AddProduct from "../components/manageproduct/AddProduct.jsx";
import EditProduct from "../components/manageproduct/EditProduct.jsx";
import ViewProduct from "../components/manageproduct/ViewProduct.jsx";
import ProductCard from "../components/manageproduct/ProductCard.jsx";
import api from "../../../../../api/axios.js";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const ManageProduct = () => {
  const queryClient = useQueryClient();

  // Modal states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showViewProductModal, setShowViewProductModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  // Selected product for edit/view/delete
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Loading states
  const [adding, setAdding] = useState(false);
  const [notif, setNotif] = useState("");

  // Filter states
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minSelling, setMinSelling] = useState("");
  const [maxSelling, setMaxSelling] = useState("");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [inStock, setInStock] = useState(false);
  const [ordering, setOrdering] = useState("id");

  // Pagination states
  const [searchTick, setSearchTick] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(12);

  // Category modal states
  const [categoryName, setCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");


  useEffect(() => {
    const t = setTimeout(() => setSearchTick((x) => x + 1), 400);
    return () => clearTimeout(t);
  }, [search]);


  const params = useMemo(() => {
    const q = new URLSearchParams();
    if (search.trim()) q.append("search", search.trim());
    if (category) q.append("category", category);
    if (minSelling) q.append("min_selling_price", minSelling);
    if (maxSelling) q.append("max_selling_price", maxSelling);
    if (minStock) q.append("min_stock", minStock);
    if (maxStock) q.append("max_stock", maxStock);
    if (inStock) q.append("in_stock", "true");
    if (ordering) q.append("ordering", ordering);
    // pagination params
    if (page) q.append('page', String(page));
    if (pageSizeState) q.append('page_size', String(pageSizeState));
    return q.toString();
  }, [
    searchTick,
    category,
    minSelling,
    maxSelling,
    minStock,
    maxStock,
    inStock,
    ordering,
    page,
    pageSizeState,
  ]);


  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["products", params, page, pageSizeState],
    queryFn: async () => {
      const url = `${BACKEND_URL}/products/products/${params ? `?${params}` : ""}`;
      const res = await api.get(url);
      // support DRF paginated response { count, next, previous, results }
      if (res?.data && Array.isArray(res.data.results)) {
        return res.data;
      }
      // fallback: array response
      const arr = Array.isArray(res.data) ? res.data : res.data.results || [];
      return { results: arr, count: arr.length };
    },
    keepPreviousData: true,
  });


  const fetchCategories = async () => {
    try {
      const res = await api.get(`${BACKEND_URL}/products/categories/`);
      setCategories(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId) => {
      const res = await api.delete(`${BACKEND_URL}/products/products/${productId}/`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      setNotif("Product deleted successfully");
      setTimeout(() => setNotif(""), 3000);
      setShowDeleteConfirm(false);
      setSelectedProduct(null);
    },
    onError: (err) => {
      console.error("Delete product error:", err);
      setNotif("Failed to delete product");
      setTimeout(() => setNotif(""), 3000);
    },
  });

  // Handlers for View/Edit/Delete
  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowViewProductModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowViewProductModal(false);
    setShowEditProductModal(true);
  };

  const handleDeleteProduct = (product) => {
    setSelectedProduct(product);
    setShowViewProductModal(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.id);
    }
  };

  const addCategory = async () => {
    setCategoryError("");
    if (!categoryName.trim()) {
      setCategoryError("Category name is required");
      return;
    }

    try {
      setAddingCategory(true);
      const res = await api.post(`${BACKEND_URL}/products/categories/`, { name: categoryName.trim() });
      // refresh categories list
      await fetchCategories();
      setNotif("Category added");
      setTimeout(() => setNotif(""), 3000);
      setShowAddCategoryModal(false);
      setCategoryName("");
    } catch (err) {
      console.error("Error adding category:", err);
      setCategoryError(err?.response?.data?.detail || "Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  };

  const lastPage = useMemo(() => Math.max(1, Math.ceil((data?.count || 0) / pageSizeState)), [data?.count, pageSizeState]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMinSelling("");
    setMaxSelling("");
    setMinStock("");
    setMaxStock("");
    setInStock(false);
    setOrdering("id");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          onClick={() => setShowAddProductModal(true)}
        >
          + Add Product
        </button>
        <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700" onClick={()=>setShowAddCategoryModal(true)}>
          Add Category
          </button>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowAddProductModal(false)}
            >
              &times;
            </button>
            <AddProduct
              onClose={() => setShowAddProductModal(false)}
              onAdded={() => {
                setNotif("Product added");
                setTimeout(() => setNotif(""), 3000);
                refetch();
              }}
              onLoading={(v) => setAdding(Boolean(v))}
            />
          </div>
        </div>
      )}

      {/* Adding Overlay */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-black bg-opacity-40 absolute inset-0" />
          <div className="bg-white p-4 rounded shadow">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-5 w-5 text-indigo-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              <div>Adding product…</div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notif && (
        <div className="fixed right-4 bottom-4 bg-green-600 text-white px-4 py-2 rounded shadow">
          {notif}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, description, category"
            className="border rounded px-3 py-2 text-sm"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="id">Sort: Newest</option>
            <option value="name">Name A–Z</option>
            <option value="-name">Name Z–A</option>
            <option value="selling_price">Price Low→High</option>
            <option value="-selling_price">Price High→Low</option>
            <option value="stock">Stock Low→High</option>
            <option value="-stock">Stock High→Low</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            In stock only
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <input
            value={minSelling}
            onChange={(e) => setMinSelling(e.target.value)}
            placeholder="Min selling (Rs)"
            className="border rounded px-3 py-2 text-sm"
          />

          <input
            value={maxSelling}
            onChange={(e) => setMaxSelling(e.target.value)}
            placeholder="Max selling (Rs)"
            className="border rounded px-3 py-2 text-sm"
          />

          <input
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            placeholder="Min stock"
            className="border rounded px-3 py-2 text-sm"
          />

          <input
            value={maxStock}
            onChange={(e) => setMaxStock(e.target.value)}
            placeholder="Max stock"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => { setPage(1); refetch(); }}
            className="px-3 py-2 rounded bg-indigo-600 text-white text-sm"
          >
            Apply
          </button>

          <button
            onClick={() => { clearFilters(); setPage(1); }}
            className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Main product grid */}
      {isLoading && <div>Loading products...</div>}
      {error && <div>Error loading products</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {(data?.results || []).map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            onView={handleViewProduct}
            onEdit={handleEditProduct}
          />
        ))}

        {!isLoading && (data?.results || []).length === 0 && (
          <div className="col-span-full text-center text-gray-500">No products found.</div>
        )}
      </div>

      {/* View Product Modal */}
      {showViewProductModal && selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30"
          onClick={() => setShowViewProductModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ViewProduct
              product={selectedProduct}
              onClose={() => {
                setShowViewProductModal(false);
                setSelectedProduct(null);
              }}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
            />
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditProductModal && selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30"
          onClick={() => setShowEditProductModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <EditProduct
              product={selectedProduct}
              onClose={() => {
                setShowEditProductModal(false);
                setSelectedProduct(null);
              }}
              onUpdated={() => {
                setNotif("Product updated successfully");
                setTimeout(() => setNotif(""), 3000);
                refetch();
              }}
              onLoading={(v) => setAdding(Boolean(v))}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <strong>{selectedProduct.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedProduct(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteProductMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-opacity-30"
          onClick={() => setShowAddCategoryModal(false)}
        >
          <div
            className="bg-white p-6 rounded shadow-md w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Add Category</h2>

            <label className="text-sm text-gray-700 mb-1 block">Name</label>
            <input
              type="text"
              placeholder="Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="border rounded px-3 py-2 mb-2 w-full"
            />
            {categoryError && <div className="text-red-500 text-sm mb-2">{categoryError}</div>}

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700"
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setCategoryName("");
                  setCategoryError("");
                }}
                type="button"
              >
                Cancel
              </button>

              <button
                className={`px-4 py-2 rounded-lg text-white font-semibold ${addingCategory ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                onClick={addCategory}
                disabled={addingCategory}
                type="button"
              >
                {addingCategory ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination controls */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50">Prev</button>
          <div className="text-sm text-gray-600">Page {page} of {lastPage}</div>
          <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={isLoading || page === lastPage} className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50">Next</button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Page size</label>
          <select value={pageSizeState} onChange={(e)=>{ setPageSizeState(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ManageProduct;
