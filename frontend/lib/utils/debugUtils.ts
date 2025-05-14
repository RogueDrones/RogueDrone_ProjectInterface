// frontend/lib/utils/debugUtils.ts

/**
 * Debug logger that only logs in development environment
 */
export const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

/**
 * Debug error logger that only logs in development environment
 */
export const debugError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};

/**
 * Debug API request to help troubleshoot API issues
 */
export const debugApiRequest = (method: string, url: string, data?: any) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group(`API Request: ${method} ${url}`);
  console.log('Time:', new Date().toISOString());
  if (data) {
    console.log('Request data:', data);
  }
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
  console.groupEnd();
};

/**
 * Debug API response to help troubleshoot API issues
 */
export const debugApiResponse = (
  method: string, 
  url: string, 
  status: number, 
  data?: any, 
  error?: any
) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group(`API Response: ${method} ${url}`);
  console.log('Status:', status);
  console.log('Time:', new Date().toISOString());
  if (data) {
    console.log('Response data:', data);
  }
  if (error) {
    console.error('Error:', error);
  }
  console.groupEnd();
};

/**
 * Check if the backend API is available
 * @returns Promise<boolean> - true if the API is available
 */
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/health`, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    return response.status === 200;
  } catch (error) {
    debugError('API availability check failed:', error);
    return false;
  }
};