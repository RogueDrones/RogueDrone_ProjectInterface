// frontend/lib/api/organisationApi.ts
import { Organisation, OrganisationCreate, OrganisationUpdate } from '../../types/client';
import { apiClient } from './apiClient';

const API_PATH = '/api/v1/organisations';

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
  },

  // Create a new organisation
  async createOrganisation(organisation: OrganisationCreate): Promise<Organisation> {
    const response = await apiClient.post(`${API_PATH}/`, organisation);
    return response.data;
  },

  // Update an existing organisation
  async updateOrganisation(id: string, organisation: OrganisationUpdate): Promise<Organisation> {
    const response = await apiClient.put(`${API_PATH}/${id}`, organisation);
    return response.data;
  },

  // Delete an organisation
  async deleteOrganisation(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  }
};