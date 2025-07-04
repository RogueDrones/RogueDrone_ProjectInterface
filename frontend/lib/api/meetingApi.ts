// frontend/lib/api/meetingApi.ts
import { Meeting, MeetingCreate, MeetingUpdate } from '../../types/meeting';
import { apiClient } from './apiClient';

const API_PATH = '/api/v1/meetings';

export const meetingApi = {
  // Fetch all meetings
  async getMeetings(clientId?: string, projectId?: string): Promise<Meeting[]> {
    const params: Record<string, string> = {};
    if (clientId) params['client_id'] = clientId;
    if (projectId) params['project_id'] = projectId;
    
    const response = await apiClient.get(`${API_PATH}/`, { params });
    return response.data;
  },

  // Fetch a single meeting by ID
  async getMeeting(id: string): Promise<Meeting> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new meeting
  async createMeeting(meeting: MeetingCreate): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/`, meeting);
    return response.data;
  },

  // Update an existing meeting
  async updateMeeting(id: string, meeting: MeetingUpdate): Promise<Meeting> {
    const response = await apiClient.put(`${API_PATH}/${id}`, meeting);
    return response.data;
  },

  // Delete a meeting
  async deleteMeeting(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  },
  
  // Add transcript to a meeting
  async addTranscript(id: string, transcript: string): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/${id}/transcript`, { transcript });
    return response.data;
  },
  
  // Add key points to a meeting
  async addKeyPoints(id: string, keyPoints: any[]): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/${id}/key_points`, { key_points: keyPoints });
    return response.data;
  },
  
  // Add recording URL to a meeting
  async addRecording(id: string, recordingUrl: string): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/${id}/recording`, { recording_url: recordingUrl });
    return response.data;
  }
};