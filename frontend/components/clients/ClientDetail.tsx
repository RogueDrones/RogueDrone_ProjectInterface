// frontend/components/clients/ClientDetail.tsx
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Client, Organisation, Project, Meeting, Document } from '../../types';
import { formatDate, formatShortDate, formatDateTime } from '../../lib/utils/dateUtils';
import { clientApi, organisationApi, projectApi, meetingApi, documentApi } from '../../lib/api';
import { useApiStatus, withApiStatus } from '../../hooks/useApiStatus';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

// Tab enum for managing selected tab state
enum TabType {
  INFO = 'info',
  PROJECTS = 'projects',
  MEETINGS = 'meetings',
  DOCUMENTS = 'documents',
}

interface ClientDetailProps {
  clientId: string;
}

const ClientDetail: React.FC<ClientDetailProps> = ({ clientId }) => {
  // State management
  const [client, setClient] = useState<Client | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.INFO);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    client: true,
    organisation: false,
    projects: false,
    meetings: false,
    documents: false,
  });
  
  const { status, error, setStatus, setError } = useApiStatus();

  // Fetch client data
  useEffect(() => {
    const fetchClientData = async () => {
      setIsLoading({ ...isLoading, client: true });
      
      const result = await withApiStatus(
        () => clientApi.getClient(clientId),
        { setStatus, setError }
      );

      if (result) {
        setClient(result);
        setIsLoading({ ...isLoading, client: false });
        
        // If client has an organisation_id, fetch the organisation details
        if (result.organisation_id) {
          setIsLoading({ ...isLoading, organisation: true });
          try {
            const org = await organisationApi.getOrganisation(result.organisation_id);
            setOrganisation(org);
          } catch (error) {
            console.error('Failed to fetch organisation details:', error);
          } finally {
            setIsLoading({ ...isLoading, organisation: false });
          }
        }
      } else {
        setIsLoading({ ...isLoading, client: false });
      }
    };

    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  // Fetch projects when projects tab is selected
  useEffect(() => {
    const fetchProjects = async () => {
      if (activeTab === TabType.PROJECTS && clientId && !projects.length) {
        setIsLoading({ ...isLoading, projects: true });
        
        try {
          const fetchedProjects = await projectApi.getProjects(clientId);
          setProjects(fetchedProjects);
        } catch (error) {
          console.error('Failed to fetch projects:', error);
        } finally {
          setIsLoading({ ...isLoading, projects: false });
        }
      }
    };

    fetchProjects();
  }, [activeTab, clientId, projects.length]);

  // Fetch meetings when meetings tab is selected
  useEffect(() => {
    const fetchMeetings = async () => {
      if (activeTab === TabType.MEETINGS && clientId && !meetings.length) {
        setIsLoading({ ...isLoading, meetings: true });
        
        try {
          const fetchedMeetings = await meetingApi.getMeetings(clientId);
          setMeetings(fetchedMeetings);
        } catch (error) {
          console.error('Failed to fetch meetings:', error);
        } finally {
          setIsLoading({ ...isLoading, meetings: false });
        }
      }
    };

    fetchMeetings();
  }, [activeTab, clientId, meetings.length]);

  // Fetch documents when documents tab is selected
  useEffect(() => {
    const fetchDocuments = async () => {
      if (activeTab === TabType.DOCUMENTS && clientId && !documents.length) {
        setIsLoading({ ...isLoading, documents: true });
        
        try {
          const fetchedDocuments = await documentApi.getDocuments(clientId);
          setDocuments(fetchedDocuments);
        } catch (error) {
          console.error('Failed to fetch documents:', error);
        } finally {
          setIsLoading({ ...isLoading, documents: false });
        }
      }
    };

    fetchDocuments();
  }, [activeTab, clientId, documents.length]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Loading state
  if (isLoading.client) {
    return (
      <div className="p-8">
        <LoadingSpinner size="large" text="Loading client information..." />
      </div>
    );
  }

  // Error state
  if (!client) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> Failed to load client information.</span>
        <p className="mt-2">{error?.message || 'Client not found'}</p>
        <div className="mt-4">
          <Link href="/clients" className="text-red-700 underline">
            Return to clients list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Client header */}
      <div className="bg-blue-700 text-white p-4">
        <h2 className="text-2xl font-bold">{client.name}</h2>
        <div className="flex mt-2 text-sm">
          <div className="mr-6">
            <span className="opacity-75">Email:</span>{' '}
            <a href={`mailto:${client.email}`} className="underline">
              {client.email}
            </a>
          </div>
          {client.phone && (
            <div>
              <span className="opacity-75">Phone:</span> {client.phone}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => handleTabChange(TabType.INFO)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.INFO
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => handleTabChange(TabType.PROJECTS)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.PROJECTS
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => handleTabChange(TabType.MEETINGS)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.MEETINGS
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Meetings
          </button>
          <button
            onClick={() => handleTabChange(TabType.DOCUMENTS)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.DOCUMENTS
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* Info tab */}
        {activeTab === TabType.INFO && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Client Details</h3>
                <dl>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client.name}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                        {client.email}
                      </a>
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {client.phone || 'Not provided'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Organisation</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {isLoading.organisation ? (
                        <span className="text-gray-500">Loading...</span>
                      ) : organisation ? (
                        <Link href={`/organisations/${organisation._id}`} className="text-blue-600 hover:underline">
                          {organisation.name}
                        </Link>
                      ) : (
                        'Not associated with any organisation'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                <dl>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(client.created_at)}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(client.updated_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Initial Query */}
            {client.initial_query && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Initial Query</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{client.initial_query}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects tab */}
        {activeTab === TabType.PROJECTS && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Projects</h3>
              <Link
                href={`/projects/new?client_id=${clientId}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Add New Project
              </Link>
            </div>

            {isLoading.projects ? (
              <div className="py-8">
                <LoadingSpinner text="Loading projects..." />
              </div>
            ) : projects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budget
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projects.map((project) => (
                      <tr key={project._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/projects/${project._id}`} className="text-blue-600 hover:underline">
                            {project.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.start_date ? formatShortDate(project.start_date) : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.end_date ? formatShortDate(project.end_date) : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/projects/${project._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Edit
                          </Link>
                          <Link href={`/projects/${project._id}`} className="text-blue-600 hover:text-blue-900">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <p className="text-gray-500">No projects found for this client.</p>
                <Link
                  href={`/projects/new?client_id=${clientId}`}
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  Create the first project
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Meetings tab */}
        {activeTab === TabType.MEETINGS && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Meetings</h3>
              <Link
                href={`/meetings/new?client_id=${clientId}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Schedule Meeting
              </Link>
            </div>

            {isLoading.meetings ? (
              <div className="py-8">
                <LoadingSpinner text="Loading meetings..." />
              </div>
            ) : meetings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {meetings.map((meeting) => (
                      <tr key={meeting._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/meetings/${meeting._id}`} className="text-blue-600 hover:underline">
                            {meeting.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(meeting.start_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {meeting.virtual 
                            ? 'Virtual'
                            : meeting.location || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {meeting.project_id ? (
                            <Link href={`/projects/${meeting.project_id}`} className="text-blue-600 hover:underline">
                              View Project
                            </Link>
                          ) : (
                            'Not specified'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/meetings/${meeting._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Edit
                          </Link>
                          <Link href={`/meetings/${meeting._id}`} className="text-blue-600 hover:text-blue-900">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <p className="text-gray-500">No meetings scheduled with this client.</p>
                <Link
                  href={`/meetings/new?client_id=${clientId}`}
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  Schedule a meeting
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Documents tab */}
        {activeTab === TabType.DOCUMENTS && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <Link
                href={`/documents/new?client_id=${clientId}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Create Document
              </Link>
            </div>

            {isLoading.documents ? (
              <div className="py-8">
                <LoadingSpinner text="Loading documents..." />
              </div>
            ) : documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((document) => (
                      <tr key={document._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/documents/${document._id}`} className="text-blue-600 hover:underline">
                            {document.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.document_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={document.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          v{document.current_version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.project_id ? (
                            <Link href={`/projects/${document.project_id}`} className="text-blue-600 hover:underline">
                              View Project
                            </Link>
                          ) : (
                            'Not specified'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatShortDate(document.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/documents/${document._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Edit
                          </Link>
                          <Link href={`/documents/${document._id}`} className="text-blue-600 hover:text-blue-900">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <p className="text-gray-500">No documents found for this client.</p>
                <Link
                  href={`/documents/new?client_id=${clientId}`}
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  Create a document
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetail;