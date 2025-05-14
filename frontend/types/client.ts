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

// Base organisation properties
export interface OrganisationBase {
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  social_media?: Record<string, string>;
  notes?: string;
}

// Interface for organisation creation
export interface OrganisationCreate extends OrganisationBase {}

// Interface for organisation updates (all fields optional)
export interface OrganisationUpdate {
  name?: string;
  website?: string;
  industry?: string;
  location?: string;
  social_media?: Record<string, string>;
  notes?: string;
}

// Full organisation model including server-generated fields
export interface Organisation extends OrganisationBase {
  _id: string;
  created_at: string;
  updated_at: string;
}