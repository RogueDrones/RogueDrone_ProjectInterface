// frontend/pages/organisations/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { organisationApi } from '../../lib/api/organisationApi';
import { Organisation } from '../../types';
import { useApiStatus, withApiStatus } from '../../hooks/useApiStatus';
import ApiHealthCheck from '../../components/ApiHealthCheck';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OrganisationsPage() {
  const router = useRouter();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const { status, isLoading, isError, error, setStatus, setError } = useApiStatus();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load organisations on component mount
  useEffect(() => {
    const fetchOrganisations = async () => {
      const fetchedOrganisations = await withApiStatus(
        () => organisationApi.getOrganisations(),
        { setStatus, setError }
      );

      if (fetchedOrganisations) {
        setOrganisations(fetchedOrganisations);
      }
    };

    fetchOrganisations();
  }, []);

  // Handle organisation deletion
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this organisation?')) {
      setDeleteId(id);
      const result = await withApiStatus(
        () => organisationApi.deleteOrganisation(id),
        { setStatus, setError }
      );

      if (result) {
        // Remove deleted organisation from state
        setOrganisations(organisations.filter(org => org._id !== id));
        setDeleteId(null);
      }
    }
  };

  return (
    <Layout title="Organisations | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <ApiHealthCheck />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Organisations</h1>
          <Link
            href="/organisations/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add New Organisation
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && !deleteId && (
          <div className="text-center py-4">
            <LoadingSpinner text="Loading organisations..." />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error?.message || 'Failed to load organisations'}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && organisations.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No organisations found</p>
            <p className="mt-2">
              <Link 
                href="/organisations/new" 
                className="text-blue-600 hover:underline"
              >
                Add your first organisation
              </Link>
            </p>
          </div>
        )}

        {/* Organisation list */}
        {organisations.length > 0 && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organisations.map((organisation) => (
                  <tr key={organisation._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/organisations/${organisation._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {organisation.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {organisation.industry || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {organisation.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {organisation.website ? (
                        <a 
                          href={organisation.website}
                          target="_blank"
                          rel="noopener noreferrer" 
                          className="text-blue-500 hover:underline"
                        >
                          Visit website
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/organisations/${organisation._id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(organisation._id)}
                        className={`text-red-600 hover:text-red-900 ${
                          deleteId === organisation._id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={deleteId === organisation._id}
                      >
                        {deleteId === organisation._id ? 'Deleting...' : 'Delete'}
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