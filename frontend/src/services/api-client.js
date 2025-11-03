import { API_BASE } from '../config/api.js';

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const apiClient = {
  import: (data) =>
    apiRequest('/api/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  sync: (data) =>
    apiRequest('/api/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

