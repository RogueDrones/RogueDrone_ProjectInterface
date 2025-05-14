# backend/tests/test_clients.py
import pytest
from fastapi import status
from bson import ObjectId

from app.core.config import settings


pytestmark = pytest.mark.asyncio


async def test_create_client(test_client, user_token, test_organisation):
    """Test creating a new client."""
    client_data = {
        "name": "New Client",
        "email": "new.client@example.com",
        "phone": "123-456-7890",
        "organisation_id": str(test_organisation["_id"]),
        "notes": "Test notes",
        "initial_query": "Initial query"
    }
    
    response = test_client.post(
        f"{settings.API_V1_STR}/clients/",
        json=client_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == client_data["name"]
    assert response.json()["email"] == client_data["email"]
    assert response.json()["phone"] == client_data["phone"]
    assert response.json()["organisation_id"] == client_data["organisation_id"]
    assert "_id" in response.json()


async def test_get_clients(test_client, user_token, test_client_data):
    """Test retrieving clients."""
    response = test_client.get(
        f"{settings.API_V1_STR}/clients/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)
    # At least one client should exist (the test client)
    assert len(response.json()) >= 1


async def test_get_client_by_id(test_client, user_token, test_client_data):
    """Test retrieving a client by ID."""
    response = test_client.get(
        f"{settings.API_V1_STR}/clients/{test_client_data['_id']}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["_id"] == str(test_client_data["_id"])
    assert response.json()["name"] == test_client_data["name"]
    assert response.json()["email"] == test_client_data["email"]


async def test_get_nonexistent_client(test_client, user_token):
    """Test retrieving a non-existent client."""
    fake_id = str(ObjectId())
    response = test_client.get(
        f"{settings.API_V1_STR}/clients/{fake_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


async def test_update_client(test_client, user_token, test_client_data):
    """Test updating a client."""
    update_data = {
        "name": "Updated Client Name",
        "notes": "Updated notes"
    }
    
    response = test_client.put(
        f"{settings.API_V1_STR}/clients/{test_client_data['_id']}",
        json=update_data,
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["name"] == update_data["name"]
    assert response.json()["notes"] == update_data["notes"]
    assert response.json()["email"] == test_client_data["email"]  # Unchanged field


async def test_delete_client(test_client, user_token, test_db):
    """Test deleting a client."""
    # First create a client to delete
    client_data = {
        "name": "Client To Delete",
        "email": "delete.me@example.com",
        "created_at": pytest.importorskip("datetime").datetime.utcnow(),
        "updated_at": pytest.importorskip("datetime").datetime.utcnow()
    }
    
    result = await test_db.clients.insert_one(client_data)
    client_id = result.inserted_id
    
    response = test_client.delete(
        f"{settings.API_V1_STR}/clients/{client_id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Client deleted successfully"
    
    # Verify client is deleted
    client = await test_db.clients.find_one({"_id": client_id})
    assert client is None