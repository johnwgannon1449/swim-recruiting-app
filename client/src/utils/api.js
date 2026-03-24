import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize error messages & handle expired sessions
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      err.userMessage = 'Could not connect to the server. Check your internet connection.';
    } else {
      const data = err.response.data;
      err.userMessage =
        data?.error ||
        (Array.isArray(data?.errors) && data.errors[0]?.msg) ||
        'Something went wrong. Please try again.';

      // Session expired — clean up and redirect to login
      if (err.response.status === 401) {
        localStorage.removeItem('token');
        // Only redirect if not already on an auth page
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Wrap an async API call with automatic retry on network/5xx errors.
 * Exponential backoff: 1s, 2s (2 retries max).
 *
 * @param {() => Promise} fn - Function that returns a promise (API call)
 * @param {number} maxRetries
 */
export async function withRetry(fn, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const isRetryable =
        !err.response ||                    // network error
        status === 429 ||                   // rate limit
        (status >= 500 && status < 600);    // server error

      // Don't retry 401 (handled by interceptor) or 4xx client errors
      if (!isRetryable || attempt >= maxRetries) break;

      const delay = 1000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export default api;
