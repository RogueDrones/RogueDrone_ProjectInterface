# backend/app/api/endpoints/clients.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=ClientResponse)
async def create_client(
    client_in: ClientCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new client.
    """
    client_collection = db.get_database().clients
    
    # Check if client already exists with this email
    existing_client = await client_collection.find_one({"email": client_in.email})
    if existing_client:
        raise HTTPException(
            status_code=400,
            detail="A client with this email already exists."
        )
    
    # Create client document
    client_data = client_in.dict()
    client_data["created_at"] = client_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId if necessary
    if client_data.get("organisation_id"):
        client_data["organisation_id"] = ObjectId(client_data["organisation_id"])
    
    # Insert into database
    result = await client_collection.insert_one(client_data)
    client_data["_id"] = result.inserted_id
    
    return client_data


@router.get("/", response_model=List[ClientResponse])
async def read_clients(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve clients.
    """
    client_collection = db.get_database().clients
    clients = await client_collection.find().skip(skip).limit(limit).to_list(length=limit)
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
async def read_client(
    client_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get client by ID.
    """
    client_collection = db.get_database().clients
    client = await client_collection.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_in: ClientUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a client.
    """
    client_collection = db.get_database().clients
    
    # Check if client exists
    client = await client_collection.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update fields
    update_data = client_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId if necessary
    if update_data.get("organisation_id"):
        update_data["organisation_id"] = ObjectId(update_data["organisation_id"])
    
    await client_collection.update_one(
        {"_id": ObjectId(client_id)}, {"$set": update_data}
    )
    
    return await client_collection.find_one({"_id": ObjectId(client_id)})


@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a client.
    """
    client_collection = db.get_database().clients
    
    # Check if client exists
    client = await client_collection.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    await client_collection.delete_one({"_id": ObjectId(client_id)})
    
    return {"message": "Client deleted successfully"}