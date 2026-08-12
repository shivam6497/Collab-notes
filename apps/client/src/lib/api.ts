import axios from "axios";
import { useAuthStore } from "./store";

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:5000";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

/**
 * Intercepts 401 responses and silently attempts a token refresh before
 * retrying the original request. If the refresh also fails, the local auth
 * state is cleared and the user is redirected to the login page.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true}
        );
        return api(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
