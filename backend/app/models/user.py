# backend/app/models/user.py
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class User(BaseModel):
    """User model with Pydantic v2 compatibility"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    first_name: str
    last_name: str
    hashed_password: str
    is_active: bool = True
    is_admin: bool = False
    
    # Pydantic v2 uses model_config instead of Config class
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )