# backend/app/models/organisation.py
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class Organisation(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    social_media: Optional[Dict[str, HttpUrl]] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )