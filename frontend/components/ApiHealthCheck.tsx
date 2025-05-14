// frontend/components/ApiHealthCheck.tsx
import { useEffect, useState } from 'react';

interface ApiHealthCheckProps {
  onHealthCheckResult?: (isHealthy: boolean) => void;
}

export default function ApiHealthCheck({ onHealthCheckResult }: ApiHealthCheckProps) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
    setApiUrl(url);

    const checkHealth = async () => {
      try {
        console.log(`Checking API health at ${url}/health`);
        const response = await fetch(`${url}/health`, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          console.log('API is healthy');
          setIsHealthy(true);
          if (onHealthCheckResult) onHealthCheckResult(true);
        } else {
          console.error('API health check failed:', response.status);
          setIsHealthy(false);
          setError(`API returned status ${response.status}`);
          if (onHealthCheckResult) onHealthCheckResult(false);
        }
      } catch (err) {
        console.error('API health check error:', err);
        setIsHealthy(false);
        setError('Cannot connect to API');
        if (onHealthCheckResult) onHealthCheckResult(false);
      }
    };

    checkHealth();
  }, [onHealthCheckResult]);

  if (isHealthy === null) {
    return null; // Still checking
  }

  if (isHealthy === true) {
    return null; // API is healthy, no need to display anything
  }

  // API is not healthy, show error
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold">API Connection Error</p>
          <p className="text-sm">{error || 'Cannot connect to the backend API'}</p>
          <p className="text-sm mt-1">
            Please ensure the backend is running at <span className="font-mono">{apiUrl}</span>
          </p>
          <div className="mt-2">
            <p className="text-sm font-semibold">Troubleshooting steps:</p>
            <ul className="list-disc list-inside text-sm ml-2 mt-1">
              <li>Check if the backend container is running</li>
              <li>Verify there are no CORS issues</li>
              <li>Ensure the API URL is correct in your .env.local file</li>
              <li>Check for any network issues or firewall restrictions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}