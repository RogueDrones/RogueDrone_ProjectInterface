// frontend/types/project.ts

// Base milestone properties
export interface MilestoneBase {
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
}

// Interface for milestone creation
export interface MilestoneCreate extends MilestoneBase {}

// Interface for milestone updates
export interface MilestoneUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  completed?: boolean;
  completed_at?: string;
}

// Full milestone model
export interface Milestone extends MilestoneBase {}

// Base project properties
export interface ProjectBase {
  title: string;
  description?: string;
  client_id: string;
  organisation_id?: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  assessment_score?: number;
  notes?: string;
}

// Interface for project creation
export interface ProjectCreate extends ProjectBase {
  milestones?: MilestoneCreate[];
}

// Interface for project updates
export interface ProjectUpdate {
  title?: string;
  description?: string;
  client_id?: string;
  organisation_id?: string;
  status?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  assessment_score?: number;
  notes?: string;
  milestones?: MilestoneCreate[];
}

// Full project model including server-generated fields
export interface Project extends ProjectBase {
  _id: string;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

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

// frontend/types/document.ts

// Document version properties
export interface DocumentVersionBase {
  version_number: number;
  content: string;
  created_by: string;
  notes?: string;
}

// Interface for document version creation
export interface DocumentVersionCreate extends DocumentVersionBase {}

// Full document version model
export interface DocumentVersion extends DocumentVersionBase {
  created_at: string;
}

// Base document properties
export interface DocumentBase {
  title: string;
  document_type: string;
  client_id: string;
  project_id?: string;
  status: string;
  requires_signature: boolean;
}

// Interface for document creation
export interface DocumentCreate extends DocumentBase {
  content: string; // Initial content for version 1
}

// Interface for document updates
export interface DocumentUpdate {
  title?: string;
  document_type?: string;
  client_id?: string;
  project_id?: string;
  status?: string;
  requires_signature?: boolean;
  new_version_content?: string;
  new_version_notes?: string;
}

// Full document model including server-generated fields
export interface Document extends DocumentBase {
  _id: string;
  current_version: number;
  versions: DocumentVersion[];
  signed: boolean;
  signed_at?: string;
  signed_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// frontend/types/index.ts

// Re-export all interfaces from a single file for easier imports
export * from './client';
export * from './project';
export * from './meeting';
export * from './document';