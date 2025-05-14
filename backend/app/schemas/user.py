# backend/app/schemas/user.py
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserResponse(UserBase):
    id: str = Field(..., alias="_id") 
    is_active: bool
    is_admin: bool
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class UserInDB(UserResponse):
    hashed_password: str