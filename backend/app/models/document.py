# backend/app/models/document.py
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class DocumentVersion(BaseModel):
    version_number: int
    content: str
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    
    # Pydantic v2 config
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Document(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    document_type: str
    client_id: PyObjectId
    project_id: Optional[PyObjectId] = None
    status: str = "draft"
    current_version: int = 1
    versions: List[DocumentVersion] = []
    requires_signature: bool = False
    signed: bool = False
    signed_at: Optional[datetime] = None
    signed_by: Optional[PyObjectId] = None
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )