# backend/app/services/user.py
from typing import Optional
from bson.objectid import ObjectId

from app.core.database import db
from app.core.auth import verify_password, get_password_hash
from app.schemas.user import UserCreate
from app.models.user import User


async def get_user_by_email(email: str) -> Optional[User]:
    """
    Get a user by email
    """
    user_collection = db.get_database().users
    user_data = await user_collection.find_one({"email": email})
    if user_data:
        return User(**user_data)
    return None


async def get_user_by_id(user_id: str) -> Optional[User]:
    """
    Get a user by ID
    """
    user_collection = db.get_database().users
    user_data = await user_collection.find_one({"_id": ObjectId(user_id)})
    if user_data:
        return User(**user_data)
    return None


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """
    Authenticate a user
    """
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def create_user(user_in: UserCreate) -> User:
    """
    Create a new user
    """
    user_collection = db.get_database().users
    
    # Check if user with this email already exists
    existing_user = await get_user_by_email(user_in.email)
    if existing_user:
        raise ValueError("Email already registered")
    
    # Create user object
    user_data = user_in.dict(exclude={"password"})
    user_data["hashed_password"] = get_password_hash(user_in.password)
    user_data["is_active"] = True
    user_data["is_admin"] = False  # Default to non-admin
    
    # Insert into database
    result = await user_collection.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    
    return User(**user_data)