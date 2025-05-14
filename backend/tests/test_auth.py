# backend/tests/test_auth.py
import pytest
from httpx import AsyncClient
from fastapi import status

from app.main import app
from app.core.config import settings


pytestmark = pytest.mark.asyncio


async def test_login(test_client, test_user):
    """Test user login."""
    response = test_client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": test_user["email"], "password": "password"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


async def test_login_invalid_credentials(test_client):
    """Test login with invalid credentials."""
    response = test_client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": "invalid@example.com", "password": "wrongpassword"}
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


async def test_me_endpoint(test_client, user_token):
    """Test the me endpoint."""
    response = test_client.get(
        f"{settings.API_V1_STR}/auth/me",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["email"] == "test@example.com"
    assert response.json()["first_name"] == "Test"
    assert response.json()["last_name"] == "User"


async def test_me_endpoint_no_token(test_client):
    """Test the me endpoint without token."""
    response = test_client.get(
        f"{settings.API_V1_STR}/auth/me"
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


async def test_register_user(test_client):
    """Test user registration."""
    user_data = {
        "email": "newuser@example.com",
        "first_name": "New",
        "last_name": "User",
        "password": "securepassword"
    }
    
    response = test_client.post(
        f"{settings.API_V1_STR}/auth/register",
        json=user_data
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["email"] == user_data["email"]
    assert response.json()["first_name"] == user_data["first_name"]
    assert response.json()["last_name"] == user_data["last_name"]
    assert "hashed_password" not in response.json()