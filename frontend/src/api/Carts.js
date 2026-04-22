import api from "./axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

/**
 * Fetch all carts for the current user
 * @returns {Promise<Object>} - Cart data with items
 */
export async function fetchCarts() {
  const response = await api.get(`${BACKEND_URL}/carts/`);
  return response.data;
}

/**
 * Fetch cart for a specific shop
 * @param {number} shopId - The shop/business ID
 * @returns {Promise<Object>} - Cart data for that shop
 */
export async function fetchCartByShop(shopId) {
  const response = await api.get(`${BACKEND_URL}/carts/shop/${shopId}/`);
  return response.data;
}

/**
 * Add item(s) to cart
 * @param {number} shopId - The shop/business ID
 * @param {Array} items - Array of { product_id, quantity }
 * @returns {Promise<Object>} - Updated cart
 */
export async function addToCart(shopId, items) {
  const response = await api.post(`${BACKEND_URL}/carts/add/`, {
    shop_id: shopId,
    items,
  });
  return response.data;
}

/**
 * Update cart item quantity
 * @param {number} cartItemId - The cart item ID
 * @param {number} quantity - New quantity
 * @returns {Promise<Object>} - Updated cart item
 */
export async function updateCartItem(cartItemId, quantity) {
  const response = await api.patch(`${BACKEND_URL}/carts/item/${cartItemId}/`, {
    quantity,
  });
  return response.data;
}

/**
 * Remove item from cart
 * @param {number} cartItemId - The cart item ID
 * @returns {Promise<Object>} - Success response
 */
export async function removeFromCart(cartItemId) {
  const response = await api.delete(`${BACKEND_URL}/carts/item/${cartItemId}/remove/`);
  return response.data;
}

/**
 * Clear entire cart for a shop
 * @param {number} shopId - The shop/business ID
 * @returns {Promise<Object>} - Success response
 */
export async function clearCart(shopId) {
  const response = await api.delete(`${BACKEND_URL}/carts/shop/${shopId}/clear/`);
  return response.data;
}
