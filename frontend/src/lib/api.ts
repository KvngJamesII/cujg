import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Public routes that should never trigger a redirect on 401
const PUBLIC_PATHS = ['/auth/me', '/auth/refresh', '/auth/login', '/auth/register'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry or redirect for auth/me or refresh calls
    const isAuthCall = PUBLIC_PATHS.some((p) => originalRequest?.url?.includes(p));
    if (isAuthCall) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        return api(originalRequest);
      } catch {
        // Refresh failed — only redirect if on a protected page
        const protectedPrefixes = ['/dashboard', '/bots', '/billing', '/settings', '/admin', '/checkout'];
        const isProtected = protectedPrefixes.some((p) => window.location.pathname.startsWith(p));
        if (isProtected) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
