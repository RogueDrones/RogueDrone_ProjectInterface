# backend/app/api/endpoints/meetings.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.meeting import MeetingCreate, MeetingUpdate, MeetingResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    meeting_in: MeetingCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new meeting.
    """
    meeting_collection = db.get_database().meetings
    client_collection = db.get_database().clients
    project_collection = db.get_database().projects
    
    # Verify client exists
    client = await client_collection.find_one({"_id": ObjectId(meeting_in.client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify project exists if provided
    if meeting_in.project_id:
        project = await project_collection.find_one({"_id": ObjectId(meeting_in.project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Create meeting document
    meeting_data = meeting_in.dict()
    meeting_data["created_at"] = meeting_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId
    meeting_data["client_id"] = ObjectId(meeting_data["client_id"])
    if meeting_data.get("project_id"):
        meeting_data["project_id"] = ObjectId(meeting_data["project_id"])
    
    # Insert into database
    result = await meeting_collection.insert_one(meeting_data)
    meeting_data["_id"] = result.inserted_id
    
    return meeting_data


@router.get("/", response_model=List[MeetingResponse])
async def read_meetings(
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[str] = None,
    project_id: Optional[str] = None,
    start_after: Optional[datetime] = None,
    start_before: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve meetings with optional filtering.
    """
    meeting_collection = db.get_database().meetings
    
    # Build query filter
    query = {}
    if client_id:
        query["client_id"] = ObjectId(client_id)
    if project_id:
        query["project_id"] = ObjectId(project_id)
    if start_after:
        query["start_time"] = {"$gte": start_after}
    if start_before:
        if "start_time" in query:
            query["start_time"]["$lte"] = start_before
        else:
            query["start_time"] = {"$lte": start_before}
    
    # Execute query
    meetings = await meeting_collection.find(query).sort("start_time", -1).skip(skip).limit(limit).to_list(length=limit)
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def read_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get meeting by ID.
    """
    meeting_collection = db.get_database().meetings
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: str,
    meeting_in: MeetingUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a meeting.
    """
    meeting_collection = db.get_database().meetings
    client_collection = db.get_database().clients
    project_collection = db.get_database().projects
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update fields
    update_data = meeting_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Verify client exists if provided
    if update_data.get("client_id"):
        client = await client_collection.find_one({"_id": ObjectId(update_data["client_id"])})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        update_data["client_id"] = ObjectId(update_data["client_id"])
    
    # Verify project exists if provided
    if update_data.get("project_id"):
        project = await project_collection.find_one({"_id": ObjectId(update_data["project_id"])})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        update_data["project_id"] = ObjectId(update_data["project_id"])
    
    # Handle attendees update if provided
    if update_data.get("attendees") is not None:
        # Replace the entire attendees array
        pass
    
    # Handle key_points update if provided
    if update_data.get("key_points") is not None:
        # Replace the entire key_points array
        pass
    
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": update_data}
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a meeting.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    await meeting_collection.delete_one({"_id": ObjectId(meeting_id)})
    
    return {"message": "Meeting deleted successfully"}


@router.post("/{meeting_id}/transcript", response_model=MeetingResponse)
async def add_transcript(
    meeting_id: str,
    transcript: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Add or update transcript for a meeting.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update transcript
    update_data = {
        "transcript": transcript,
        "updated_at": datetime.utcnow()
    }
    
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": update_data}
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})


@router.post("/{meeting_id}/key_points", response_model=MeetingResponse)
async def add_key_points(
    meeting_id: str,
    key_points: List[dict],
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Add key points from meeting transcript.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update key points
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)},
        {
            "$push": {"key_points": {"$each": key_points}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})


@router.post("/{meeting_id}/recording", response_model=MeetingResponse)
async def add_recording(
    meeting_id: str,
    recording_url: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Add or update recording URL for a meeting.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update recording URL
    update_data = {
        "recording_url": recording_url,
        "updated_at": datetime.utcnow()
    }
    
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": update_data}
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})