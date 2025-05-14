// frontend/lib/api/projectApi.ts
import axios from 'axios';
import { Project, ProjectCreate, ProjectUpdate } from '../../types/project';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
const API_PATH = '/api/v1/projects';

// Configure axios instance with default headers
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const projectApi = {
  // Fetch all projects
  async getProjects(clientId?: string): Promise<Project[]> {
    const params = clientId ? { client_id: clientId } : {};
    const response = await apiClient.get(`${API_PATH}/`, { params });
    return response.data;
  },

  // Fetch a single project by ID
  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new project
  async createProject(project: ProjectCreate): Promise<Project> {
    const response = await apiClient.post(`${API_PATH}/`, project);
    return response.data;
  },

  // Update an existing project
  async updateProject(id: string, project: ProjectUpdate): Promise<Project> {
    const response = await apiClient.put(`${API_PATH}/${id}`, project);
    return response.data;
  },

  // Delete a project
  async deleteProject(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  }
};