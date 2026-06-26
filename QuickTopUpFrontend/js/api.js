// ============================================
// QuickTopUp — API client
// Thin wrapper around fetch() that attaches the JWT,
// normalizes errors, and centralizes the base URL.
// ============================================

const API_BASE = `${window.BACKEND_URL}/api`;

function getToken() {
  return localStorage.getItem('qtu_token');
}

function setToken(token) {
  localStorage.setItem('qtu_token', token);
}

function clearToken() {
  localStorage.removeItem('qtu_token');
  localStorage.removeItem('qtu_user');
}

function getStoredUser() {
  const raw = localStorage.getItem('qtu_user');
  return raw ? JSON.parse(raw) : null;
}

function setStoredUser(user) {
  localStorage.setItem('qtu_user', JSON.stringify(user));
}

/**
 * Core request function. Throws an Error with a .status property on failure
 * so callers can branch on status codes (e.g. 401 -> redirect to login).
 */
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (!token) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    const err = new Error('Could not reach the server. Check your connection and try again.');
    err.status = 0;
    throw err;
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;

    if (res.status === 401 && auth) {
      clearToken();
      if (!location.pathname.endsWith('login.html') && !location.pathname.endsWith('register.html')) {
        location.href = 'login.html';
      }
    }
    throw err;
  }

  return data;
}

const api = {
  // ---- Auth ----
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiRequest('/auth/me'),

  // ---- Wallet ----
  getWallet: () => apiRequest('/wallet'),
  initiateFund: (amount) => apiRequest('/wallet/initiate-fund', { method: 'POST', body: { amount } }),
  verifyFund: (reference) => apiRequest(`/wallet/verify-fund/${encodeURIComponent(reference)}`),
  purchase: (payload) => apiRequest('/wallet/purchase', { method: 'POST', body: payload }),

  // ---- VTU ----
  getAirtimeNetworks: () => apiRequest('/vtu/airtime-networks'),
  getDataNetworks: () => apiRequest('/vtu/data-networks'),
  getDataPlans: (network) => apiRequest(`/vtu/data-plans?network=${encodeURIComponent(network)}`),
  validateCustomer: (payload) => apiRequest('/vtu/validate', { method: 'POST', body: payload }),
  buyAirtime: (payload) => apiRequest('/vtu/airtime', { method: 'POST', body: payload }),
  buyData: (payload) => apiRequest('/vtu/data', { method: 'POST', body: payload }),
  buyCable: (payload) => apiRequest('/vtu/cable', { method: 'POST', body: payload }),
  buyElectricity: (payload) => apiRequest('/vtu/electricity', { method: 'POST', body: payload }),
  getTransactionStatus: (reference) => apiRequest(`/vtu/transaction/${encodeURIComponent(reference)}`),

  // ---- Transactions ----
  getTransactions: (page = 1, limit = 20) => apiRequest(`/transactions?page=${page}&limit=${limit}`),
};
