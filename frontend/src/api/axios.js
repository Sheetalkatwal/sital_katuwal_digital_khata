import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// Automatically attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;


    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");

        const res = await axios.post("http://localhost:8000/accounts/token/refresh/", {
          refresh,
        });

        const newAccess = res.data.access;

        localStorage.setItem("access", newAccess);


        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.log("Refresh token expired. Logging out.");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
