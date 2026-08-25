import axios from "axios";

/**
 * Centralized Axios instance. All API calls go through this file rather
 * than importing axios directly in pages/components.
 *
 * Request interceptor attaches:
 *  - Authorization: Bearer <token>   (if a token is stored)
 *  - X-Business-Id: <business id>    (if a current business is stored)
 *
 * Response interceptor clears stored auth state on a 401, since that
 * means the token is missing/invalid/expired — there's nothing useful
 * left to do with it.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

export const TOKEN_STORAGE_KEY = "abm_access_token";
export const BUSINESS_STORAGE_KEY = "abm_current_business_id";

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const businessId = localStorage.getItem(BUSINESS_STORAGE_KEY);
  if (businessId) {
    config.headers = config.headers ?? {};
    config.headers["X-Business-Id"] = businessId;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(BUSINESS_STORAGE_KEY);
    }
    return Promise.reject(error);
  }
);

export default apiClient;