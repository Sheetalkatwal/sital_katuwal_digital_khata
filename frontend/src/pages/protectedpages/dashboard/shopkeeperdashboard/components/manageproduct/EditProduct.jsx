import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../../../../api/axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

/**
 * EditProduct Modal Component
 * Allows shopkeeper to update an existing product
 */
const EditProduct = ({ product, onClose, onUpdated, onLoading }) => {
  const queryClient = useQueryClient();

  // Form state initialized with product data
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    cost_price: "",
    selling_price: "",
    stock: "",
    image: null,
  });

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [keepExistingImage, setKeepExistingImage] = useState(true);

  // Initialize form with product data
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        description: product.description || "",
        category: product.category || "",
        cost_price: product.cost_price || "",
        selling_price: product.selling_price || "",
        stock: product.stock || "",
        image: null,
      });
    }
  }, [product]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get(`${BACKEND_URL}/products/categories/`);
        setCategories(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = (e) => {
    setForm({ ...form, image: e.target.files[0] });
    setKeepExistingImage(false);
  };

  // Update mutation
  const updateProductMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      
      // Add all form fields
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("cost_price", form.cost_price);
      formData.append("selling_price", form.selling_price);
      formData.append("stock", form.stock);
      
      // Only add image if a new one was selected
      if (form.image && !keepExistingImage) {
        formData.append("image", form.image);
      }

      const res = await api.patch(
        `${BACKEND_URL}/products/products/${product.id}/`,
        formData
      );

      if (!res || (res.status && res.status >= 400)) {
        throw new Error("Failed to update product");
      }

      return res.data;
    },

    onMutate: () => {
      if (typeof onLoading === "function") onLoading(true);
    },

    onSettled: () => {
      if (typeof onLoading === "function") onLoading(false);
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries(["products"]);
      if (typeof onUpdated === "function") onUpdated(data);
      if (typeof onClose === "function") onClose();
    },

    onError: (err) => {
      console.error("Update product error", err);
      setError(err?.response?.data?.detail || "Failed to update product");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    updateProductMutation.mutate();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Edit Product</h2>

      {error && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product Name
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cost Price & Selling Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cost Price (Rs)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="cost_price"
              value={form.cost_price}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Selling Price (Rs)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="selling_price"
              value={form.selling_price}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stock */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stock
          </label>
          <input
            type="number"
            min="0"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Current Image Preview */}
        {product?.image && keepExistingImage && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Image
            </label>
            <img
              src={product.image}
              alt={product.name}
              className="w-24 h-24 object-cover rounded border"
            />
          </div>
        )}

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {product?.image ? "Replace Image" : "Image"}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={updateProductMutation.isPending}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
