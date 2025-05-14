# backend/app/schemas/document.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class DocumentVersionBase(BaseModel):
    version_number: int
    content: str
    created_by: str
    notes: Optional[str] = None


class DocumentVersionCreate(DocumentVersionBase):
    pass


class DocumentVersionResponse(DocumentVersionBase):
    created_at: datetime


class DocumentBase(BaseModel):
    title: str
    document_type: str
    client_id: str
    project_id: Optional[str] = None
    status: str = "draft"
    requires_signature: bool = False


class DocumentCreate(DocumentBase):
    content: str  # Initial content for version 1


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    status: Optional[str] = None
    requires_signature: Optional[bool] = None
    new_version_content: Optional[str] = None
    new_version_notes: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: str = Field(..., alias="_id")
    current_version: int
    versions: List[DocumentVersionResponse]
    signed: bool
    signed_at: Optional[datetime] = None
    signed_by: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class DocumentInDB(DocumentResponse):
    pass