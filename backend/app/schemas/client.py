# backend/app/schemas/client.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class ClientBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    organisation_id: Optional[str] = None
    notes: Optional[str] = None
    initial_query: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    organisation_id: Optional[str] = None
    notes: Optional[str] = None
    initial_query: Optional[str] = None


class ClientResponse(ClientBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class ClientInDB(ClientResponse):
    pass