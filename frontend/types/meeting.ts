// frontend/types/meeting.ts

// Meeting attendee properties
export interface MeetingAttendeeBase {
  name: string;
  email?: string;
  organisation?: string;
  role?: string;
}

// Interface for meeting attendee creation
export interface MeetingAttendeeCreate extends MeetingAttendeeBase {}

// Full meeting attendee model
export interface MeetingAttendee extends MeetingAttendeeBase {}

// Key point properties
export interface KeyPointBase {
  content: string;
  category?: string;
}

// Interface for key point creation
export interface KeyPointCreate extends KeyPointBase {}

// Full key point model
export interface KeyPoint extends KeyPointBase {}

// Base meeting properties
export interface MeetingBase {
  title: string;
  description?: string;
  client_id: string;
  project_id?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  virtual: boolean;
  meeting_url?: string;
  notes?: string;
}

// Interface for meeting creation
export interface MeetingCreate extends MeetingBase {
  attendees?: MeetingAttendeeCreate[];
}

// Interface for meeting updates
export interface MeetingUpdate {
  title?: string;
  description?: string;
  client_id?: string;
  project_id?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  virtual?: boolean;
  meeting_url?: string;
  attendees?: MeetingAttendeeCreate[];
  recording_url?: string;
  transcript?: string;
  key_points?: KeyPointCreate[];
  notes?: string;
}

// Full meeting model including server-generated fields
export interface Meeting extends MeetingBase {
  _id: string;
  attendees: MeetingAttendee[];
  recording_url?: string;
  transcript?: string;
  key_points: KeyPoint[];
  created_at: string;
  updated_at: string;
}