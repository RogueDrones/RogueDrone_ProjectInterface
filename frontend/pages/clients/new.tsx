// frontend/pages/clients/new.tsx
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ClientForm from '../../components/clients/ClientForm';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();

  return (
    <Layout title="New Client | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create New Client</h1>
          <p className="text-gray-600 mt-1">
            Add a new client to the system
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <ClientForm />
        </div>

        <div className="mt-6">
          <Link href="/clients" className="text-blue-600 hover:underline">
            &larr; Back to Clients
          </Link>
        </div>
      </div>
    </Layout>
  );
}