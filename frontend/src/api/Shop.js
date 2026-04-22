import api from "./axios";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Fetch businesses from backend
 * @param {number} page - Page number for pagination
 * @param {string} search - Search term for filtering businesses
 * @returns {Promise<Object>} - Returns JSON data from API
 */
export async function fetchShops(page = 1, search = '') {
    try {
        const params = new URLSearchParams();
        if (page) params.append('page', page);
        if (search) params.append('search', search);

        const response = await api.get(`${BACKEND_URL}/accounts/businesses/?${params.toString()}`);


        
        const data = response.data;
        return data; 
    } catch (error) {
        console.error('Error fetching shops:', error);
        return { results: [], count: 0, next: null, previous: null };
    }
}


export async function addShopRequest(businessId) {
  const response = await api.post(`${BACKEND_URL}/accounts/add-request/`, {
    business_id: businessId
  });
  console.log("Add shop request response:", response.data);


  return response.data;
}


/**
 * Fetch single shop/business details
 * @param {number} shopId - The shop ID
 * @returns {Promise<Object>} - Returns shop detail JSON
 */
export async function fetchShopDetail(shopId) {
  try {
    const response = await api.get(`${BACKEND_URL}/accounts/businesses/${shopId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching shop detail:', error);
    throw error;
  }
}