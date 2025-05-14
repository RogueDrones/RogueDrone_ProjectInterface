# backend/app/api/endpoints/authentication.py
from datetime import timedelta
from typing import Any
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.user import authenticate_user, create_user
from app.core.auth import create_access_token
from app.core.config import settings
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate) -> Any:
    """
    Register a new user
    """
    user = await create_user(user_in)
    return user


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)) -> Any:
    """
    Get current user
    """
    # Convert the User model to a dictionary and ensure _id is a string
    user_dict = current_user.model_dump(by_alias=True)
    if "_id" in user_dict and isinstance(user_dict["_id"], ObjectId):
        user_dict["_id"] = str(user_dict["_id"])
    return user_dict