import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Debug: log every request/response to console and localStorage
api.interceptors.request.use((config) => {
  const entry = { ts: Date.now(), type: 'request', method: config.method, url: config.url, data: config.data };
  console.debug('[REDON3 DEBUG]', entry);
  try {
    const logs = JSON.parse(localStorage.getItem('redon3_debug') ?? '[]');
    logs.push(entry);
    if (logs.length > 200) logs.splice(0, logs.length - 200);
    localStorage.setItem('redon3_debug', JSON.stringify(logs));
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => {
    const entry = { ts: Date.now(), type: 'response', method: response.config.method, url: response.config.url, status: response.status, data: response.data };
    console.debug('[REDON3 DEBUG]', entry);
    try {
      const logs = JSON.parse(localStorage.getItem('redon3_debug') ?? '[]');
      logs.push(entry);
      if (logs.length > 200) logs.splice(0, logs.length - 200);
      localStorage.setItem('redon3_debug', JSON.stringify(logs));
    } catch {}
    return response;
  },
  (error) => {
    const entry = { ts: Date.now(), type: 'error', method: error.config?.method, url: error.config?.url, status: error.response?.status, data: error.response?.data, message: error.message };
    console.debug('[REDON3 DEBUG]', entry);
    try {
      const logs = JSON.parse(localStorage.getItem('redon3_debug') ?? '[]');
      logs.push(entry);
      if (logs.length > 200) logs.splice(0, logs.length - 200);
      localStorage.setItem('redon3_debug', JSON.stringify(logs));
    } catch {}
    return Promise.reject(error);
  }
);

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
