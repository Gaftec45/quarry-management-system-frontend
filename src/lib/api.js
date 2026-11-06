
import axios from "axios";

const api = axios.create({
  baseURL: "https://quarry-management-system-backend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// https://quarry-management-system-backend.onrender.com/
// http://localhost:5173

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    // Clear an expired or invalid session, but don't redirect
    // when the login request itself fails.
    if (
      status === 401 &&
      !requestUrl.includes("/auth/login")
    ) {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("currentUser");

      if (window.location.pathname !== "/") {
        window.location.replace("/");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
