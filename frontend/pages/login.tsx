// frontend/pages/login.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Link from 'next/link';

type LoginFormData = {
  email: string;
  password: string;
};

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>('');
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  
  // Get API URL on component mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
    setApiUrl(url);
    console.log('API URL:', url);
  }, []);

  // Check if backend is running
  useEffect(() => {
    const checkBackend = async () => {
      if (!apiUrl) return;
      
      try {
        // Try to access the health check endpoint
        await fetch(`${apiUrl}/health`, { method: 'GET' });
        console.log('Backend is running');
      } catch (err) {
        console.error('Backend connection error:', err);
        setError('Cannot connect to the backend server. Please ensure it is running.');
      }
    };
    
    checkBackend();
  }, [apiUrl]);
  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to login at ${apiUrl}/api/v1/auth/login`);
      
      // Convert email/password to FormData for OAuth2 compatibility
      const formData = new FormData();
      formData.append('username', data.email);
      formData.append('password', data.password);
      
      const response = await axios.post(
        `${apiUrl}/api/v1/auth/login`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('Login response:', response.data);
      
      // Save token to localStorage
      localStorage.setItem('token', response.data.access_token);
      
      // Redirect to dashboard
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          setError('Invalid email or password');
        } else if (err.response.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. Please check if the backend is running.');
      } else {
        // Something happened in setting up the request
        setError(err.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Rogue Drones Client Workflow
        </h1>
        
        <h2 className="text-xl font-semibold mb-6">Login</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.email ? 'border-red-500' : ''
              }`}
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.password ? 'border-red-500' : ''
              }`}
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
            />
            {errors.password && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            
            <Link
              href="/register"
              className="inline-block align-baseline font-bold text-sm text-blue-600 hover:text-blue-800"
            >
              Register
            </Link>
          </div>
        </form>
        
        {/* API connection info */}
        <div className="mt-8 text-xs text-gray-500">
          <p>Connecting to API: {apiUrl}</p>
          <p className="mt-1">
            If you're experiencing connection issues, please make sure the backend server is running.
          </p>
        </div>
      </div>
    </div>
  );
}