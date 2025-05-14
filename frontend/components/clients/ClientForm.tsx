// frontend/components/clients/ClientForm.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import { Client, ClientCreate, ClientUpdate, Organisation } from '../../types/client';
import { clientApi } from '../../lib/api/clientApi';
import { organisationApi } from '../../lib/api/organisationApi';
import { useApiStatus, withApiStatus } from '../../hooks/useApiStatus';

interface ClientFormProps {
  client?: Client;
  isEditing?: boolean;
}

export default function ClientForm({ client, isEditing = false }: ClientFormProps) {
  const router = useRouter();
  const { status, isLoading, isError, error, setStatus, setError } = useApiStatus();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset 
  } = useForm<ClientCreate>({
    defaultValues: client ? {
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      organisation_id: client.organisation_id || '',
      notes: client.notes || '',
      initial_query: client.initial_query || ''
    } : {}
  });

  // Load organisations for the dropdown
  useEffect(() => {
    const fetchOrganisations = async () => {
      const result = await withApiStatus(
        () => organisationApi.getOrganisations(),
        { setStatus, setError }
      );
      
      if (result) {
        setOrganisations(result);
      }
    };

    fetchOrganisations();

    // Reset form with client data if in edit mode
    if (client && isEditing) {
      reset({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        organisation_id: client.organisation_id || '',
        notes: client.notes || '',
        initial_query: client.initial_query || ''
      });
    }
  }, [client, isEditing, reset]);

  const onSubmit = async (data: ClientCreate) => {
    // Clean up empty strings to undefined for optional fields
    const clientData = {
      ...data,
      phone: data.phone || undefined,
      organisation_id: data.organisation_id || undefined,
      notes: data.notes || undefined,
      initial_query: data.initial_query || undefined
    };

    let result;
    if (isEditing && client) {
      // Update existing client
      result = await withApiStatus(
        () => clientApi.updateClient(client._id, clientData as ClientUpdate),
        { setStatus, setError }
      );
    } else {
      // Create new client
      result = await withApiStatus(
        () => clientApi.createClient(clientData),
        { setStatus, setError }
      );
    }

    if (result) {
      // Redirect to client detail page on success
      router.push(`/clients/${result._id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Error message */}
      {isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error?.message || 'An error occurred while saving the client.'}</p>
        </div>
      )}

      {/* Name field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : ''
          }`}
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Email field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
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
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Phone field */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          id="phone"
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('phone')}
        />
      </div>

      {/* Organisation field */}
      <div>
        <label htmlFor="organisation_id" className="block text-sm font-medium text-gray-700">
          Organisation
        </label>
        <select
          id="organisation_id"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('organisation_id')}
        >
          <option value="">-- Select Organisation --</option>
          {organisations.map((org) => (
            <option key={org._id} value={org._id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notes field */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('notes')}
        ></textarea>
      </div>

      {/* Initial Query field */}
      <div>
        <label htmlFor="initial_query" className="block text-sm font-medium text-gray-700">
          Initial Query
        </label>
        <textarea
          id="initial_query"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('initial_query')}
        ></textarea>
      </div>

      {/* Form actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </form>
  );
}