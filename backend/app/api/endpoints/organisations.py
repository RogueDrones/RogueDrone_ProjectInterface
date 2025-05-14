# backend/app/api/endpoints/organisations.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.organisation import OrganisationCreate, OrganisationUpdate, OrganisationResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=OrganisationResponse)
async def create_organisation(
    organisation_in: OrganisationCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new organisation.
    """
    organisation_collection = db.get_database().organisations
    
    # Check if organisation already exists with this name
    existing_org = await organisation_collection.find_one({"name": organisation_in.name})
    if existing_org:
        raise HTTPException(
            status_code=400,
            detail="An organisation with this name already exists."
        )
    
    # Create organisation document
    org_data = organisation_in.dict()
    org_data["created_at"] = org_data["updated_at"] = datetime.utcnow()
    
    # Insert into database
    result = await organisation_collection.insert_one(org_data)
    org_data["_id"] = result.inserted_id
    
    return org_data


@router.get("/", response_model=List[OrganisationResponse])
async def read_organisations(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve organisations.
    """
    organisation_collection = db.get_database().organisations
    organisations = await organisation_collection.find().skip(skip).limit(limit).to_list(length=limit)
    return organisations


@router.get("/{organisation_id}", response_model=OrganisationResponse)
async def read_organisation(
    organisation_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get organisation by ID.
    """
    organisation_collection = db.get_database().organisations
    organisation = await organisation_collection.find_one({"_id": ObjectId(organisation_id)})
    if not organisation:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return organisation


@router.put("/{organisation_id}", response_model=OrganisationResponse)
async def update_organisation(
    organisation_id: str,
    organisation_in: OrganisationUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update an organisation.
    """
    organisation_collection = db.get_database().organisations
    
    # Check if organisation exists
    organisation = await organisation_collection.find_one({"_id": ObjectId(organisation_id)})
    if not organisation:
        raise HTTPException(status_code=404, detail="Organisation not found")
    
    # Update fields
    update_data = organisation_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await organisation_collection.update_one(
        {"_id": ObjectId(organisation_id)}, {"$set": update_data}
    )
    
    return await organisation_collection.find_one({"_id": ObjectId(organisation_id)})


@router.delete("/{organisation_id}")
async def delete_organisation(
    organisation_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete an organisation.
    """
    organisation_collection = db.get_database().organisations
    client_collection = db.get_database().clients
    
    # Check if organisation exists
    organisation = await organisation_collection.find_one({"_id": ObjectId(organisation_id)})
    if not organisation:
        raise HTTPException(status_code=404, detail="Organisation not found")
    
    # Check if any clients are associated with this organisation
    clients_count = await client_collection.count_documents({"organisation_id": ObjectId(organisation_id)})
    if clients_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete organisation: {clients_count} clients are associated with it"
        )
    
    await organisation_collection.delete_one({"_id": ObjectId(organisation_id)})
    
    return {"message": "Organisation deleted successfully"}