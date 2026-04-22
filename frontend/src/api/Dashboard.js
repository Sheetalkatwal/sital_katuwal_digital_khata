import api from "./axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

/**
 * Fetch customer dashboard stats
 * @returns {Promise<Object>} - Dashboard stats for customer
 */
export async function fetchCustomerDashboard() {
  const response = await api.get(`${BACKEND_URL}/accounts/customer/dashboard/`);
  return response.data;
}

/**
 * Fetch customer analytics data
 * @param {Object} params - { metric, shop_id, period, custom_month }
 * @returns {Promise<Object>} - Analytics data
 */
export async function fetchCustomerAnalytics(params = {}) {
  const query = new URLSearchParams();
  if (params.metric) query.append("metric", params.metric);
  if (params.shop_id) query.append("shop_id", params.shop_id);
  if (params.period) query.append("period", params.period);
  if (params.custom_month) query.append("custom_month", params.custom_month);

  const response = await api.get(`${BACKEND_URL}/accounts/customer/analytics/?${query.toString()}`);
  return response.data;
}

/**
 * Fetch shopkeeper dashboard stats
 * @returns {Promise<Object>} - Dashboard stats for shopkeeper
 */
export async function fetchShopkeeperDashboard() {
  const response = await api.get(`${BACKEND_URL}/accounts/shopkeeper/dashboard/`);
  return response.data;
}

/**
 * Fetch shopkeeper analytics data
 * @param {Object} params - { metric, period, customer_id }
 * @returns {Promise<Object>} - Analytics data
 */
export async function fetchShopkeeperAnalytics(params = {}) {
  const query = new URLSearchParams();
  if (params.metric) query.append("metric", params.metric);
  if (params.period) query.append("period", params.period);
  if (params.customer_id) query.append("customer_id", params.customer_id);

  const response = await api.get(`${BACKEND_URL}/accounts/shopkeeper/analytics/?${query.toString()}`);
  return response.data;
}

/**
 * Fetch connected shops for customer
 * @returns {Promise<Object>} - List of connected shops with stats
 */
export async function fetchConnectedShops() {
  const response = await api.get(`${BACKEND_URL}/accounts/customer/connected-shops/`);
  return response.data;
}

/**
 * Fetch connected customers for shopkeeper
 * @param {Object} params - Optional filters
 * @returns {Promise<Object>} - List of connected customers
 */
export async function fetchConnectedCustomers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.page) query.append("page", params.page);

  const response = await api.get(`${BACKEND_URL}/accounts/shopkeeper/connected-customers/?${query.toString()}`);
  return response.data;
}

/**
 * Fetch recent activity for dashboard
 * @param {string} role - 'customer' or 'shopkeeper'
 * @param {number} limit - Number of items
 * @returns {Promise<Object>} - Recent activity
 */
export async function fetchRecentActivity(role, limit = 5) {
  const endpoint = role === "shopkeeper" 
    ? `${BACKEND_URL}/accounts/shopkeeper/recent-activity/`
    : `${BACKEND_URL}/accounts/customer/recent-activity/`;
  
  const response = await api.get(`${endpoint}?limit=${limit}`);
  return response.data;
}
