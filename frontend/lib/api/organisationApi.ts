// frontend/lib/api/organisationApi.ts
import axios from 'axios';
import { Organisation } from '../../types/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
const API_PATH = '/api/v1/organisations';

// Configure axios instance with default headers
const apiClient = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const organisationApi = {
  // Fetch all organisations
  async getOrganisations(): Promise<Organisation[]> {
    const response = await apiClient.get(`${API_PATH}/`);
    return response.data;
  },

  // Fetch a single organisation by ID
  async getOrganisation(id: string): Promise<Organisation> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  }
};