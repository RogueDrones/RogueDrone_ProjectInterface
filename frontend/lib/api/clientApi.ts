// frontend/lib/api/clientApi.ts
import axios from 'axios';
import { Client, ClientCreate, ClientUpdate } from '../../types/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
const API_PATH = '/api/v1/clients';

console.log('API URL:', API_URL); // Debug log

// Configure axios instance with default headers
const apiClient = axios.create({
  baseURL: API_URL,
  // Add timeout to avoid hanging requests
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`Making request to: ${config.baseURL}${config.url}`); // Debug log
  return config;
});

export const clientApi = {
  // Fetch all clients
  async getClients(): Promise<Client[]> {
    const response = await apiClient.get(`${API_PATH}/`);
    return response.data;
  },

  // Fetch a single client by ID
  async getClient(id: string): Promise<Client> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new client
  async createClient(client: ClientCreate): Promise<Client> {
    const response = await apiClient.post(`${API_PATH}/`, client);
    return response.data;
  },

  // Update an existing client
  async updateClient(id: string, client: ClientUpdate): Promise<Client> {
    const response = await apiClient.put(`${API_PATH}/${id}`, client);
    return response.data;
  },

  // Delete a client
  async deleteClient(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  }
};