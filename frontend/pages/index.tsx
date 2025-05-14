// frontend/pages/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

    // Don’t render the dashboard until we know we’re logged in
  if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Rogue Drones Client Workflow</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Clients</h2>
            <p className="text-gray-600 mb-4">Manage client information and relationships</p>
            <button
              onClick={() => router.push('/clients')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Clients
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Projects</h2>
            <p className="text-gray-600 mb-4">Track active and completed projects</p>
            <button
              onClick={() => router.push('/projects')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Projects
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Meetings</h2>
            <p className="text-gray-600 mb-4">Schedule and manage client meetings</p>
            <button
              onClick={() => router.push('/meetings')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Meetings
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Documents</h2>
            <p className="text-gray-600 mb-4">Create and manage client documents</p>
            <button
              onClick={() => router.push('/documents')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Documents
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Organizations</h2>
            <p className="text-gray-600 mb-4">Manage client organizations</p>
            <button
              onClick={() => router.push('/organizations')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Organizations
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}