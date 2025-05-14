// frontend/lib/api/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';

// Create a base API client that handles auth and errors
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 10000,
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // If token exists, add it to headers
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      console.log(`Making request to: ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  client.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response) {
        // Handle 401 Unauthorized errors by redirecting to login
        if (error.response.status === 401) {
          console.error('Unauthorized: Token might be expired');
          
          // If we're in a browser environment
          if (typeof window !== 'undefined') {
            // Clear token
            localStorage.removeItem('token');
            
            // Redirect to login
            window.location.href = '/login';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );

  return client;
};

// Create a singleton instance of the API client
export const apiClient = createApiClient();