// frontend/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// Define the User interface
interface User {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
}

// Define the Auth context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create the Auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Create the Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
  
  // Public routes that don't need redirect to login
  const publicRoutes = ['/login', '/register'];

  // Check if the user is already logged in on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      // If no token and not on a public route, redirect to login
      if (!token) {
        setLoading(false);
        setUser(null);
        
        // Only redirect if not already on a public route
        if (!publicRoutes.includes(router.pathname)) {
          router.push('/login');
        }
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUser(response.data);
        setError(null);
        
        // If authenticated and on login page, redirect to home
        if (publicRoutes.includes(router.pathname)) {
          router.push('/');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // Clear token if invalid
        localStorage.removeItem('token');
        setUser(null);
        
        // Redirect to login if not already there
        if (!publicRoutes.includes(router.pathname)) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [API_URL, router.pathname]);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Convert email/password to FormData for OAuth2 compatibility
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await axios.post(
        `${API_URL}/api/v1/auth/login`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Save token to localStorage
      localStorage.setItem('token', response.data.access_token);

      // Fetch user info
      const userResponse = await axios.get(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`
        }
      });

      setUser(userResponse.data);
      router.push('/');
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response) {
        if (err.response.status === 401) {
          setError('Invalid email or password');
        } else if (err.response.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        setError('No response from server. Please check if the backend is running.');
      } else {
        setError(err.message || 'An error occurred during login. Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the Auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};