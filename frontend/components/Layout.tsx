// frontend/components/Layout.tsx
import React, { ReactNode, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './common/LoadingSpinner';

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ 
  children, 
  title = 'Rogue Drones Client Workflow' 
}: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // If auth context is loading, show a loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    );
  }

  // If no user and not on login/register page, redirect is handled by AuthContext
  // We just don't render anything here
  if (!user && !router.pathname.includes('/login') && !router.pathname.includes('/register')) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  // Don't render the layout for login/register pages
  if (router.pathname === '/login' || router.pathname === '/register') {
    return (
      <>
        <Head>
          <title>{title}</title>
          <meta name="description" content="Client workflow management system for Rogue Drones" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Client workflow management system for Rogue Drones" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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
              {user && (
                <span className="mr-4 hidden md:inline">{user.first_name} {user.last_name}</span>
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
              {user && (
                <div className="py-2 text-sm text-blue-200">{user.first_name} {user.last_name}</div>
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