import api from "./axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

/**
 * Fetch orders for the current customer
 * @param {Object} params - Optional filters { status, page, page_size, business_id }
 * @returns {Promise<Object>} - Orders data
 */
export async function fetchCustomerOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.page) query.append("page", params.page);
  if (params.page_size) query.append("page_size", params.page_size);
  if (params.business_id) query.append("business_id", params.business_id);

  const response = await api.get(`${BACKEND_URL}/orders/customer-orders/?${query.toString()}`);
  return response.data;
}

/**
 * Fetch orders for the shopkeeper (their business)
 * @param {Object} params - Optional filters { aggregate, period, year, month }
 * @returns {Promise<Object>} - Orders data or aggregates
 */
export async function fetchShopkeeperOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.aggregate) query.append("aggregate", params.aggregate);
  if (params.period) query.append("period", params.period);
  if (params.year) query.append("year", params.year);
  if (params.month) query.append("month", params.month);

  const response = await api.get(`${BACKEND_URL}/orders/shopkeeper-orders/?${query.toString()}`);
  return response.data;
}

/**
 * Update order status (shopkeeper action)
 * @param {number} orderId - The order ID
 * @param {string} action - Action to perform (accept, shipped, delivered, complete)
 * @returns {Promise<Object>} - Updated order
 */
export async function updateOrderStatus(orderId, action) {
  const response = await api.post(`${BACKEND_URL}/orders/shopkeeper-orders/`, {
    order_id: orderId,
    action,
  });
  return response.data;
}

/**
 * Create a new order
 * @param {Object} orderData - Order data { items, payment_method, order_type, initial_payment, business_id, customer_id }
 * @returns {Promise<Object>} - Created order with eSewa payment URL if applicable
 */
export async function createOrder(orderData) {
  const response = await api.post(`${BACKEND_URL}/orders/api/orders/create/`, orderData);
  return response.data;
}
