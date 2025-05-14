# backend/app/api/endpoints/documents.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=DocumentResponse)
async def create_document(
    document_in: DocumentCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new document.
    """
    document_collection = db.get_database().documents
    client_collection = db.get_database().clients
    project_collection = db.get_database().projects
    
    # Verify client exists
    client = await client_collection.find_one({"_id": ObjectId(document_in.client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify project exists if provided
    if document_in.project_id:
        project = await project_collection.find_one({"_id": ObjectId(document_in.project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Create document
    document_data = document_in.dict(exclude={"content"})
    document_data["created_at"] = document_data["updated_at"] = datetime.utcnow()
    document_data["created_by"] = str(current_user.id)
    document_data["current_version"] = 1
    document_data["signed"] = False
    
    # Create first version
    first_version = {
        "version_number": 1,
        "content": document_in.content,
        "created_by": str(current_user.id),
        "created_at": datetime.utcnow(),
        "notes": "Initial version"
    }
    document_data["versions"] = [first_version]
    
    # Convert string IDs to ObjectId
    document_data["client_id"] = ObjectId(document_data["client_id"])
    if document_data.get("project_id"):
        document_data["project_id"] = ObjectId(document_data["project_id"])
    
    # Insert into database
    result = await document_collection.insert_one(document_data)
    document_data["_id"] = result.inserted_id
    
    return document_data


@router.get("/", response_model=List[DocumentResponse])
async def read_documents(
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[str] = None,
    project_id: Optional[str] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve documents with optional filtering.
    """
    document_collection = db.get_database().documents
    
    # Build query filter
    query = {}
    if client_id:
        query["client_id"] = ObjectId(client_id)
    if project_id:
        query["project_id"] = ObjectId(project_id)
    if document_type:
        query["document_type"] = document_type
    if status:
        query["status"] = status
    
    # Execute query
    documents = await document_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
async def read_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get document by ID.
    """
    document_collection = db.get_database().documents
    document = await document_collection.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    document_in: DocumentUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a document.
    """
    document_collection = db.get_database().documents
    client_collection = db.get_database().clients
    project_collection = db.get_database().projects
    
    # Check if document exists
    document = await document_collection.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update basic fields
    update_data = document_in.dict(exclude={"new_version_content", "new_version_notes"})
    update_data = {k: v for k, v in update_data.items() if v is not None}
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
    
    # Handle new version if content provided
    if document_in.new_version_content:
        new_version_number = document["current_version"] + 1
        new_version = {
            "version_number": new_version_number,
            "content": document_in.new_version_content,
            "created_by": str(current_user.id),
            "created_at": datetime.utcnow(),
            "notes": document_in.new_version_notes or f"Version {new_version_number}"
        }
        
        update_data["current_version"] = new_version_number
        await document_collection.update_one(
            {"_id": ObjectId(document_id)},
            {"$push": {"versions": new_version}}
        )
    
    # Update document
    if update_data:
        await document_collection.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": update_data}
        )
    
    return await document_collection.find_one({"_id": ObjectId(document_id)})


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a document.
    """
    document_collection = db.get_database().documents
    
    # Check if document exists
    document = await document_collection.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Don't allow deletion of signed documents
    if document.get("signed"):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a signed document"
        )
    
    await document_collection.delete_one({"_id": ObjectId(document_id)})
    
    return {"message": "Document deleted successfully"}


@router.post("/{document_id}/sign", response_model=DocumentResponse)
async def sign_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Sign a document.
    """
    document_collection = db.get_database().documents
    
    # Check if document exists
    document = await document_collection.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if document requires signature
    if not document.get("requires_signature"):
        raise HTTPException(
            status_code=400,
            detail="This document does not require a signature"
        )
    
    # Check if document is already signed
    if document.get("signed"):
        raise HTTPException(
            status_code=400,
            detail="This document is already signed"
        )
    
    # Sign the document
    sign_data = {
        "signed": True,
        "signed_at": datetime.utcnow(),
        "signed_by": str(current_user.id),
        "updated_at": datetime.utcnow()
    }
    
    await document_collection.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": sign_data}
    )
    
    return await document_collection.find_one({"_id": ObjectId(document_id)})