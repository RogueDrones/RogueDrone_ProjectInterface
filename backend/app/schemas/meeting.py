# backend/app/schemas/meeting.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class MeetingAttendeeBase(BaseModel):
    name: str
    email: Optional[str] = None
    organisation: Optional[str] = None
    role: Optional[str] = None


class MeetingAttendeeCreate(MeetingAttendeeBase):
    pass


class MeetingAttendeeResponse(MeetingAttendeeBase):
    pass


class KeyPointBase(BaseModel):
    content: str
    category: Optional[str] = None


class KeyPointCreate(KeyPointBase):
    pass


class KeyPointResponse(KeyPointBase):
    pass


class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    client_id: str
    project_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    virtual: bool = True
    meeting_url: Optional[HttpUrl] = None
    notes: Optional[str] = None


class MeetingCreate(MeetingBase):
    attendees: List[MeetingAttendeeCreate] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    virtual: Optional[bool] = None
    meeting_url: Optional[HttpUrl] = None
    attendees: Optional[List[MeetingAttendeeCreate]] = None
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    key_points: Optional[List[KeyPointCreate]] = None
    notes: Optional[str] = None


class MeetingResponse(MeetingBase):
    id: str = Field(..., alias="_id")
    attendees: List[MeetingAttendeeResponse] = []
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    key_points: List[KeyPointResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class MeetingInDB(MeetingResponse):
    pass