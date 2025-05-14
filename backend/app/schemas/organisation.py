# backend/app/schemas/organisation.py
from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, HttpUrl, Field, ConfigDict


class OrganisationBase(BaseModel):
    name: str
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    social_media: Optional[Dict[str, HttpUrl]] = None
    notes: Optional[str] = None


class OrganisationCreate(OrganisationBase):
    pass


class OrganisationUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    social_media: Optional[Dict[str, HttpUrl]] = None
    notes: Optional[str] = None


class OrganisationResponse(OrganisationBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class OrganisationInDB(OrganisationResponse):
    pass