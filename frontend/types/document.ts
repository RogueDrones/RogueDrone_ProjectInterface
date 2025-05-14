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