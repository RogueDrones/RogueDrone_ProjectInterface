# backend/app/models/meeting.py
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class MeetingAttendee(BaseModel):
    name: str
    email: Optional[str] = None
    organisation: Optional[str] = None
    role: Optional[str] = None
    
    # Pydantic v2 config
    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )

class KeyPoint(BaseModel):
    content: str
    category: Optional[str] = None  # e.g., "requirement", "concern", "question"
    
    # Pydantic v2 config
    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )

class Meeting(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    client_id: PyObjectId
    project_id: Optional[PyObjectId] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    virtual: bool = True
    meeting_url: Optional[HttpUrl] = None
    attendees: List[MeetingAttendee] = []
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    key_points: List[KeyPoint] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )