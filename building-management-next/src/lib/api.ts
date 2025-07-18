// API configuration for connecting to Railway backend
const API_BASE_URL = process.env.NEXT_PUBLIC_RAILWAY_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  BUILDINGS: `${API_BASE_URL}/api/buildings`,
  TENANTS: `${API_BASE_URL}/api/tenants`,
  BILLS: `${API_BASE_URL}/api/bills`,
  LOGIN: `${API_BASE_URL}/api/login`,
  LOGOUT: `${API_BASE_URL}/api/logout`,
};

// Generic API function
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config: RequestInit = {
    headers: { ...defaultHeaders, ...options.headers },
    credentials: 'include', // Include cookies for session management
    ...options,
  };

  try {
    const response = await fetch(endpoint, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Specific API functions
export const api = {
  // Buildings
  getBuildings: () => apiRequest(API_ENDPOINTS.BUILDINGS),
  createBuilding: (data: any) => apiRequest(API_ENDPOINTS.BUILDINGS, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Tenants
  getTenants: () => apiRequest(API_ENDPOINTS.TENANTS),
  createTenant: (data: any) => apiRequest(API_ENDPOINTS.TENANTS, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Bills
  getBills: () => apiRequest(API_ENDPOINTS.BILLS),
  createBill: (data: any) => apiRequest(API_ENDPOINTS.BILLS, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Auth
  login: (credentials: any) => apiRequest(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  logout: () => apiRequest(API_ENDPOINTS.LOGOUT, {
    method: 'POST',
  }),
};
