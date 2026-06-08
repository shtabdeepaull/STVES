// ============================================================
// STVES Frontend API Client
// Connects React frontend with Node.js/Express backend
// ============================================================

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const tokenStorage = {
  getToken() {
    return localStorage.getItem('stves_token');
  },
  setToken(token) {
    localStorage.setItem('stves_token', token);
  },
  removeToken() {
    localStorage.removeItem('stves_token');
    localStorage.removeItem('stves_user');
  },
  getUser() {
    const raw = localStorage.getItem('stves_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) {
    localStorage.setItem('stves_user', JSON.stringify(user));
  },
};

async function request(path, options = {}) {
  const token = tokenStorage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

const api = {
  baseUrl: API_BASE_URL,

  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (payload) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  me: () => request('/auth/me'),

  // Admin/System
  getUsers: () => request('/users'),
  updateUserStatus: (id, status) => request(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  getAnalyticsStats: () => request('/analytics/stats'),
  getActivityLogs: () => request('/analytics/logs'),

  // Vehicles
  getVehicles: () => request('/vehicles'),
  getMyVehicles: () => request('/vehicles/my'),
  createVehicle: (payload) => request('/vehicles', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateVehicleStatus: (id, status) => request(`/vehicles/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status }),
  }),
  verifyVehicle: (registrationNumber, driverId = '') => {
    const query = driverId ? `?driverId=${encodeURIComponent(driverId)}` : '';
    return request(`/vehicles/verify/${encodeURIComponent(registrationNumber)}${query}`);
  },

  // Licenses
  getLicenses: () => request('/licenses'),
  getMyLicenses: () => request('/licenses/my'),
  createLicense: (payload) => request('/licenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateLicenseStatus: (id, status) => request(`/licenses/${id}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status }),
  }),
  verifyLicense: (licenseNumber) => request(`/licenses/verify/${encodeURIComponent(licenseNumber)}`),

  // Assignments
  getAssignments: () => request('/assignments'),
  getMyAssignments: () => request('/assignments/my'),
  createAssignment: (payload) => request('/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  removeAssignment: (id) => request(`/assignments/${id}/remove`, { method: 'PUT' }),
  checkAssignment: (vehicleId, driverId) => request(`/assignments/check/${vehicleId}/${driverId}`),

  // Violations / E-Challan
  getViolations: () => request('/violations'),
  getMyViolations: () => request('/violations/my'),
  getVehicleViolations: (vehicleId) => request(`/violations/vehicle/${vehicleId}`),
  createViolation: (payload) => request('/violations', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  reviewViolation: (id, payload) => request(`/violations/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  updatePayment: (id, paymentStatus) => request(`/violations/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify({ paymentStatus }),
  }),

  verifyByQR: async (qrValue) => {
  return request(`/qr/verify/${encodeURIComponent(qrValue)}`);
  },
  // Verification logs
  getVerificationLogs: () => request('/verification-logs'),
  getMyVerificationLogs: () => request('/verification-logs/my'),
};

export default api;
