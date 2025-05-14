// frontend/pages/clients/[id]/edit.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import ClientForm from '../../../components/clients/ClientForm';
import { clientApi } from '../../../lib/api/clientApi';
import { Client } from '../../../types/client';
import { useApiStatus, withApiStatus } from '../../../hooks/useApiStatus';
import Link from 'next/link';

export default function EditClientPage() {
  const router = useRouter();
  const { id } = router.query;
  const [client, setClient] = useState<Client | null>(null);
  const { status, isLoading, isError, error, setStatus, setError } = useApiStatus();

  useEffect(() => {
    const fetchClient = async () => {
      if (typeof id !== 'string') return;

      const result = await withApiStatus(
        () => clientApi.getClient(id),
        { setStatus, setError }
      );

      if (result) {
        setClient(result);
      }
    };

    if (id) {
      fetchClient();
    }
  }, [id]);

  return (
    <Layout title="Edit Client | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {client ? `Edit ${client.name}` : 'Edit Client'}
          </h1>
          <p className="text-gray-600 mt-1">
            Update client information
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading client...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error?.message || 'Failed to load client details'}</p>
            <div className="mt-2">
              <Link href="/clients" className="text-red-700 underline">
                Return to clients list
              </Link>
            </div>
          </div>
        )}

        {/* Client form */}
        {client && !isLoading && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <ClientForm client={client} isEditing={true} />
          </div>
        )}

        <div className="mt-6">
          <Link 
            href={client ? `/clients/${client._id}` : '/clients'} 
            className="text-blue-600 hover:underline"
          >
            &larr; Back to {client ? client.name : 'Clients'}
          </Link>
        </div>
      </div>
    </Layout>
  );
}