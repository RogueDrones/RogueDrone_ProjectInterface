// frontend/pages/clients/[id].tsx
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ClientDetail from '../../components/clients/ClientDetail';
import ApiHealthCheck from '../../components/ApiHealthCheck';

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <Layout title="Client Details | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <ApiHealthCheck />
        
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Client Details</h1>
          <div className="space-x-4">
            {typeof id === 'string' && (
              <Link
                href={`/clients/${id}/edit`}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Edit Client
              </Link>
            )}
            <Link
              href="/clients"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back to Clients
            </Link>
          </div>
        </div>

        {typeof id === 'string' ? (
          <ClientDetail clientId={id} />
        ) : (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
            <p className="font-bold">Loading...</p>
            <p>Waiting for client ID parameter.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}