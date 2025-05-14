# backend/tests/conftest.py
import asyncio
import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from app.main import app
from app.core.database import db
from app.core.config import settings
from app.core.auth import create_access_token, get_password_hash


# Override database name for tests
settings.DATABASE_NAME = "rogue_drones_test"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def mongodb_client():
    """Connect to the MongoDB test database."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.client = client
    yield client
    # Clean up the test database after tests
    await client.drop_database(settings.DATABASE_NAME)
    client.close()


@pytest.fixture(scope="module")
def test_client(mongodb_client):
    """Create a FastAPI test client."""
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="module")
async def test_db(mongodb_client):
    """Get the test database."""
    return mongodb_client[settings.DATABASE_NAME]


@pytest.fixture(scope="module")
async def test_user(test_db) -> Dict[str, Any]:
    """Create a test user."""
    user_data = {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "hashed_password": get_password_hash("password"),
        "is_active": True,
        "is_admin": False
    }
    
    user_collection = test_db.users
    await user_collection.delete_many({"email": user_data["email"]})
    result = await user_collection.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    
    return user_data


@pytest.fixture(scope="module")
def user_token(test_user) -> str:
    """Create a token for the test user."""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_access_token(
        test_user["_id"], expires_delta=access_token_expires
    )


@pytest.fixture(scope="module")
async def test_organisation(test_db) -> Dict[str, Any]:
    """Create a test organisation."""
    org_data = {
        "name": "Test Organisation",
        "website": "https://example.com",
        "industry": "Technology",
        "location": "Test City",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    org_collection = test_db.organisations
    await org_collection.delete_many({"name": org_data["name"]})
    result = await org_collection.insert_one(org_data)
    org_data["_id"] = result.inserted_id
    
    return org_data


@pytest.fixture(scope="module")
async def test_client_data(test_db, test_organisation) -> Dict[str, Any]:
    """Create a test client."""
    client_data = {
        "name": "Test Client",
        "email": "client@example.com",
        "phone": "123-456-7890",
        "organisation_id": test_organisation["_id"],
        "notes": "Test client notes",
        "initial_query": "Initial test query",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    client_collection = test_db.clients
    await client_collection.delete_many({"email": client_data["email"]})
    result = await client_collection.insert_one(client_data)
    client_data["_id"] = result.inserted_id
    
    return client_data


@pytest.fixture(scope="module")
async def test_project(test_db, test_client_data) -> Dict[str, Any]:
    """Create a test project."""
    project_data = {
        "title": "Test Project",
        "description": "Test project description",
        "client_id": test_client_data["_id"],
        "organisation_id": test_client_data["organisation_id"],
        "status": "assessment",
        "budget": 1000.0,
        "start_date": datetime.utcnow(),
        "end_date": datetime.utcnow() + timedelta(days=30),
        "milestones": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    project_collection = test_db.projects
    await project_collection.delete_many({"title": project_data["title"], "client_id": project_data["client_id"]})
    result = await project_collection.insert_one(project_data)
    project_data["_id"] = result.inserted_id
    
    return project_data