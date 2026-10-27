import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let accessToken = null;
let refreshPromise = null;
let handlers = { onRefreshed: () => {}, onFailure: () => {} };

export const setAccessToken = (token) => {
  accessToken = token;
};

export const setAuthHandlers = (newHandlers) => {
  handlers = { ...handlers, ...newHandlers };
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const { user, accessToken: token } = res.data.data;
        accessToken = token;
        return { user, accessToken: token };
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const SKIP_REFRESH_URLS = [
  "/auth/login",
  "/auth/guest/signup",
  "/auth/refresh",
  "/auth/logout",
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const shouldSkip = SKIP_REFRESH_URLS.some((url) => original?.url?.includes(url));

    if (status === 401 && original && !original._retry && !shouldSkip) {
      original._retry = true;

      try {
        const session = await refreshSession();
        handlers.onRefreshed(session);
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(original);
      } catch {
        accessToken = null;
        handlers.onFailure();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;