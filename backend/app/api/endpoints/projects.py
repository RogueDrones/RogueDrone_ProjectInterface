# backend/app/api/endpoints/projects.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new project.
    """
    project_collection = db.get_database().projects
    client_collection = db.get_database().clients
    organisation_collection = db.get_database().organisations
    
    # Verify client exists
    client = await client_collection.find_one({"_id": ObjectId(project_in.client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify organisation exists if provided
    if project_in.organisation_id:
        org = await organisation_collection.find_one({"_id": ObjectId(project_in.organisation_id)})
        if not org:
            raise HTTPException(status_code=404, detail="Organisation not found")
    
    # Create project document
    project_data = project_in.dict()
    project_data["created_at"] = project_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId
    project_data["client_id"] = ObjectId(project_data["client_id"])
    if project_data.get("organisation_id"):
        project_data["organisation_id"] = ObjectId(project_data["organisation_id"])
    
    # Insert into database
    result = await project_collection.insert_one(project_data)
    project_data["_id"] = result.inserted_id
    
    return project_data


@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[str] = None,
    organisation_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve projects with optional filtering.
    """
    project_collection = db.get_database().projects
    
    # Build query filter
    query = {}
    if client_id:
        query["client_id"] = ObjectId(client_id)
    if organisation_id:
        query["organisation_id"] = ObjectId(organisation_id)
    if status:
        query["status"] = status
    
    # Execute query
    projects = await project_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get project by ID.
    """
    project_collection = db.get_database().projects
    project = await project_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a project.
    """
    project_collection = db.get_database().projects
    client_collection = db.get_database().clients
    organisation_collection = db.get_database().organisations
    
    # Check if project exists
    project = await project_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    update_data = project_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Verify client exists if provided
    if update_data.get("client_id"):
        client = await client_collection.find_one({"_id": ObjectId(update_data["client_id"])})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        update_data["client_id"] = ObjectId(update_data["client_id"])
    
    # Verify organisation exists if provided
    if update_data.get("organisation_id"):
        org = await organisation_collection.find_one({"_id": ObjectId(update_data["organisation_id"])})
        if not org:
            raise HTTPException(status_code=404, detail="Organisation not found")
        update_data["organisation_id"] = ObjectId(update_data["organisation_id"])
    
    await project_collection.update_one(
        {"_id": ObjectId(project_id)}, {"$set": update_data}
    )
    
    return await project_collection.find_one({"_id": ObjectId(project_id)})


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a project.
    """
    project_collection = db.get_database().projects
    document_collection = db.get_database().documents
    meeting_collection = db.get_database().meetings
    
    # Check if project exists
    project = await project_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check for related documents
    documents_count = await document_collection.count_documents({"project_id": ObjectId(project_id)})
    if documents_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete project: {documents_count} documents are associated with it"
        )
    
    # Check for related meetings
    meetings_count = await meeting_collection.count_documents({"project_id": ObjectId(project_id)})
    if meetings_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete project: {meetings_count} meetings are associated with it"
        )
    
    await project_collection.delete_one({"_id": ObjectId(project_id)})
    
    return {"message": "Project deleted successfully"}