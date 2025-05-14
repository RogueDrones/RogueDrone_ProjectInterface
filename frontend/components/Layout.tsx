// frontend/components/Layout.tsx
import React, { ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ 
  children, 
  title = 'Rogue Drones Client Workflow' 
}: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  const router = useRouter();

  // Fetch user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // If no token, redirect to login
        router.push('/login');
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        console.log('Fetching user info from:', `${apiUrl}/api/v1/auth/me`);
        
        const response = await fetch(
          `${apiUrl}/api/v1/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.ok) {
          const userData = await response.json();
          setUserName(`${userData.first_name} ${userData.last_name}`);
        } else if (response.status === 401 || response.status === 403) {
          // Unauthorized - token may be expired
          localStorage.removeItem('token');
          router.push('/login');
        } else {
          console.error('Error fetching user info:', response.status);
          setAuthError(true);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setAuthError(true);
      }
    };

    if (router.pathname !== '/login' && router.pathname !== '/register') {
      fetchUserInfo();
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Client workflow management system for Rogue Drones" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Show API error banner if needed */}
      {authError && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p className="font-bold">API Connection Issue</p>
          <p>Unable to connect to the backend API. Please ensure the server is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</p>
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="font-bold text-xl">
                Rogue Drones
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <Link href="/clients" className="hover:text-blue-200">
                Clients
              </Link>
              <Link href="/projects" className="hover:text-blue-200">
                Projects
              </Link>
              <Link href="/meetings" className="hover:text-blue-200">
                Meetings
              </Link>
              <Link href="/documents" className="hover:text-blue-200">
                Documents
              </Link>
              <Link href="/organisations" className="hover:text-blue-200">
                Organizations
              </Link>
            </nav>

            {/* User menu */}
            <div className="flex items-center">
              {userName && (
                <span className="mr-4 hidden md:inline">{userName}</span>
              )}
              <button
                onClick={handleLogout}
                className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="pt-4 pb-2 md:hidden">
              <Link
                href="/clients"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Clients
              </Link>
              <Link
                href="/projects"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Projects
              </Link>
              <Link
                href="/meetings"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Meetings
              </Link>
              <Link
                href="/documents"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Documents
              </Link>
              <Link
                href="/organisations"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Organizations
              </Link>
              {userName && (
                <div className="py-2 text-sm text-blue-200">{userName}</div>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow bg-gray-50">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">
                &copy; {new Date().getFullYear()} Rogue Drones. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-300 hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-300 hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-gray-300 hover:text-white">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}