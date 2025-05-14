// frontend/types/client.ts

// Base client properties
export interface ClientBase {
  name: string;
  email: string;
  phone?: string;
  organisation_id?: string;
  notes?: string;
  initial_query?: string;
}

// Interface for client creation
export interface ClientCreate extends ClientBase {}

// Interface for client updates (all fields optional)
export interface ClientUpdate {
  name?: string;
  email?: string;
  phone?: string;
  organisation_id?: string;
  notes?: string;
  initial_query?: string;
}

// Full client model including server-generated fields
export interface Client extends ClientBase {
  _id: string;
  created_at: string;
  updated_at: string;
}

// Organisation reference for displaying organisation details with client
export interface Organisation {
  _id: string;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
}