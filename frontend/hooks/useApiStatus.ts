// frontend/hooks/useApiStatus.ts
import { useState } from 'react';

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseApiStatusReturn {
  status: ApiStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  setStatus: (status: ApiStatus) => void;
  error: Error | null;
  setError: (error: Error | null) => void;
}

export const useApiStatus = (initialStatus: ApiStatus = 'idle'): UseApiStatusReturn => {
  const [status, setStatus] = useState<ApiStatus>(initialStatus);
  const [error, setError] = useState<Error | null>(null);

  return {
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    setStatus,
    error,
    setError,
  };
};

// Helper function to handle api calls with status tracking
export const withApiStatus = async <T extends any>(
  apiCall: () => Promise<T>,
  { setStatus, setError }: Pick<UseApiStatusReturn, 'setStatus' | 'setError'>
): Promise<T | null> => {
  try {
    setStatus('loading');
    setError(null);
    const data = await apiCall();
    setStatus('success');
    return data;
  } catch (err) {
    setStatus('error');
    setError(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
};