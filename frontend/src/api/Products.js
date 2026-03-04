
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function fetchProducts(){
  const response = await fetch(`${BACKEND_URL}/products/products/`);

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  console.log("product fetched data from api", data);
  return data;
}


export async function fetchProductsByShop(shopId){
  const response = await fetch(`${BACKEND_URL}/products/shop/${shopId}/products/`);
  console.log("Fetching products for shop ID:", shopId);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  console.log("product fetched data by shop from api", data);
  return data;
}


export async function fetchProductDetailByShop(shopId, productId){
  const response = await fetch(`${BACKEND_URL}/products/shop/${shopId}/products/${productId}/`);
  console.log("Fetching product detail for shop ID:", shopId, "and product ID:", productId);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  console.log("product detail fetched data by shop from api", data);
  return data;
}