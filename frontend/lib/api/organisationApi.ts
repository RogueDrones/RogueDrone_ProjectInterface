// frontend/lib/api/organisationApi.ts
import { Organisation } from '../../types/client';
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
  }
};