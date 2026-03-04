import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import api from "../../../../../../api/axios";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

const AddProduct = ({ onClose, onAdded, onLoading }) => {
  const queryClient = useQueryClient();

  // form state
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
  };


  const addProductMutation = useMutation({
    mutationFn: async () => {
      let formData = new FormData();
      Object.keys(form).forEach((key) => {
        if (form[key]) formData.append(key, form[key]);
      });

      const res = await api.post(`${BACKEND_URL}/products/products/`, formData);

      if (!res || (res.status && res.status >= 400)) throw new Error("Failed to create product");

      return res.data;
    },

    onMutate: ()=>{
      if (typeof onLoading === 'function') onLoading(true)
    },

    onSettled: ()=>{
      if (typeof onLoading === 'function') onLoading(false)
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries(["products"]);
      if (typeof onAdded === 'function') onAdded(data)
      if (typeof onClose === 'function') onClose();
    },

    onError: (err)=>{
      console.error('Add product error', err)
    }
  });


  const handleSubmit = (e) => {
    e.preventDefault();
    addProductMutation.mutate();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Add Product</h2>

      <form onSubmit={handleSubmit} className="space-y-3">

        <div>
          <label className="block text-sm font-medium">Product Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Cost Price</label>
          <input
            type="number"
            step="0.01"
            name="cost_price"
            value={form.cost_price}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Selling Price</label>
          <input
            type="number"
            step="0.01"
            name="selling_price"
            value={form.selling_price}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Stock</label>
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Image</label>
          <input type="file" accept="image/*" onChange={handleImage} />
        </div>

        <button
          type="submit"
          disabled={addProductMutation.isLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition w-full"
        >
          {addProductMutation.isLoading ? "Adding..." : "Add Product"}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
