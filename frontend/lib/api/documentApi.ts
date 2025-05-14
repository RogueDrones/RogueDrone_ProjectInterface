// frontend/lib/api/documentApi.ts
import axios from 'axios';
import { Document, DocumentCreate, DocumentUpdate } from '../../types/document';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
const API_PATH = '/api/v1/documents';

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

export const documentApi = {
  // Fetch all documents
  async getDocuments(clientId?: string, projectId?: string, documentType?: string, status?: string): Promise<Document[]> {
    const params: Record<string, string> = {};
    if (clientId) params['client_id'] = clientId;
    if (projectId) params['project_id'] = projectId;
    if (documentType) params['document_type'] = documentType;
    if (status) params['status'] = status;
    
    const response = await apiClient.get(`${API_PATH}/`, { params });
    return response.data;
  },

  // Fetch a single document by ID
  async getDocument(id: string): Promise<Document> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new document
  async createDocument(document: DocumentCreate): Promise<Document> {
    const response = await apiClient.post(`${API_PATH}/`, document);
    return response.data;
  },

  // Update an existing document
  async updateDocument(id: string, document: DocumentUpdate): Promise<Document> {
    const response = await apiClient.put(`${API_PATH}/${id}`, document);
    return response.data;
  },

  // Delete a document
  async deleteDocument(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  },
  
  // Sign a document
  async signDocument(id: string): Promise<Document> {
    const response = await apiClient.post(`${API_PATH}/${id}/sign`);
    return response.data;
  }
};