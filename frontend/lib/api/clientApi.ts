// frontend/lib/api/clientApi.ts
import { Client, ClientCreate, ClientUpdate } from '../../types/client';
import { apiClient } from './apiClient';

const API_PATH = '/api/v1/clients';

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