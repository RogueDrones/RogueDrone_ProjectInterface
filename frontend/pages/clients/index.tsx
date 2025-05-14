// frontend/pages/clients/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { clientApi } from '../../lib/api/clientApi';
import { Client } from '../../types/client';
import { useApiStatus, withApiStatus } from '../../hooks/useApiStatus';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const { status, isLoading, isError, error, setStatus, setError } = useApiStatus();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      const fetchedClients = await withApiStatus(
        () => clientApi.getClients(),
        { setStatus, setError }
      );

      if (fetchedClients) {
        setClients(fetchedClients);
      }
    };

    fetchClients();
  }, []);

  // Handle client deletion
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setDeleteId(id);
      const result = await withApiStatus(
        () => clientApi.deleteClient(id),
        { setStatus, setError }
      );

      if (result) {
        // Remove deleted client from state
        setClients(clients.filter(client => client._id !== id));
        setDeleteId(null);
      }
    }
  };

  return (
    <Layout title="Clients | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Link
            href="/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add New Client
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && !deleteId && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading clients...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error?.message || 'Failed to load clients'}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No clients found</p>
            <p className="mt-2">
              <Link 
                href="/clients/new" 
                className="text-blue-600 hover:underline"
              >
                Add your first client
              </Link>
            </p>
          </div>
        )}

        {/* Client list */}
        {clients.length > 0 && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/clients/${client._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a href={`mailto:${client.email}`} className="text-gray-600 hover:text-gray-900">
                        {client.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {client.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {client.organisation_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/clients/${client._id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(client._id)}
                        className={`text-red-600 hover:text-red-900 ${
                          deleteId === client._id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={deleteId === client._id}
                      >
                        {deleteId === client._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}