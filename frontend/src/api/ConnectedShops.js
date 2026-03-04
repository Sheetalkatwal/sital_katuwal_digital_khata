import api from "./axios";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Fetch connected shops for the current customer
 * @returns {Promise<Array>} - Returns array of connected shops
 */
export async function fetchConnectedShops() {
  try {
    const response = await api.get(`${BACKEND_URL}/accounts/customer/connected-shops/`);
    // API returns { shops: [...] }
    return response.data.shops || [];
  } catch (error) {
    console.error('Error fetching connected shops:', error);
    return [];
  }
}
