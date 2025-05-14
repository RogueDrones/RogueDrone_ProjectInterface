# .gitignore

```
# Node.js / Next.js
node_modules/
.next/
out/
.env*
*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Python
__pycache__/
*.py[cod]
*.pyo
*.pyd
*.env
venv/
env/
ENV/
.venv/

# OS
.DS_Store
Thumbs.db

# VSCode
.vscode/

# Docker
*.pid

# Test/coverage
coverage/
*.cover
*.py,cover
.hypothesis/

# Misc
*.log
*.tsbuildinfo

# Ignore build artifacts
build/
dist/

# Ignore local config
*.sqlite3
*.db

# Ignore Jupyter Notebooks checkpoints
.ipynb_checkpoints/

```

# .vscode\settings.json

```json
{
    "cSpell.words": [
        "asyncio",
        "bson",
        "dnspython",
        "dotenv",
        "fastapi",
        "healthcheck",
        "httplib",
        "httpx",
        "INITDB",
        "ipynb",
        "organisation",
        "organisations",
        "passlib",
        "pycache",
        "pydantic",
        "pymongo",
        "pytest",
        "pytestmark",
        "securepassword",
        "uvicorn",
        "venv",
        "wrongpassword"
    ]
}
```

# backend\app\api\api.py

```py
# backend/app/api/api.py
from fastapi import APIRouter
from app.api.endpoints import authentication, clients, organisations, projects, documents, meetings

api_router = APIRouter()

api_router.include_router(authentication.router, prefix="/auth", tags=["authentication"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(organisations.router, prefix="/organisations", tags=["organisations"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(meetings.router, prefix="/meetings", tags=["meetings"])

# Health endpoint isn't needed here because it's defined at the root level in main.py
```

# backend\app\api\dependencies\auth.py

```py
# backend/app/api/dependencies/auth.py
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from bson import ObjectId

from app.core.config import settings
from app.core.database import db
from app.models.user import User
from app.schemas.token import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get the current user from the JWT token
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    user_collection = db.get_database().users
    user = await user_collection.find_one({"_id": ObjectId(token_data.sub)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ObjectId to string before creating User object
    user["_id"] = str(user["_id"])
    return User(**user)

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current active user
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current admin user
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user
```

# backend\app\api\endpoints\authentication.py

```py
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
```

# backend\app\api\endpoints\clients.py

```py
# backend/app/api/endpoints/clients.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=ClientResponse)
async def create_client(
    client_in: ClientCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new client.
    """
    client_collection = db.get_database().clients
    
    # Check if client already exists with this email
    existing_client = await client_collection.find_one({"email": client_in.email})
    if existing_client:
        raise HTTPException(
            status_code=400,
            detail="A client with this email already exists."
        )
    
    # Create client document
    client_data = client_in.dict()
    client_data["created_at"] = client_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId if necessary
    if client_data.get("organisation_id"):
        client_data["organisation_id"] = ObjectId(client_data["organisation_id"])
    
    # Insert into database
    result = await client_collection.insert_one(client_data)
    client_data["_id"] = result.inserted_id
    
    return client_data


@router.get("/", response_model=List[ClientResponse])
async def read_clients(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve clients.
    """
    client_collection = db.get_database().clients
    clients = await client_collection.find().skip(skip).limit(limit).to_list(length=limit)
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
async def read_client(
    client_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get client by ID.
    """
    client_collection = db.get_database().clients
    client = await client_collection.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_in: ClientUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a client.
    """
    client_collection = db.get_database().clients
    
    # Check if client exists
    client = await client_collection.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update fields
    update_data = client_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId if necessary
    if update_data.get("organisation_id"):
        update_data["organisation_id"] = ObjectId(update_data["organisation_id"])
    
    await client_collection.update_one(
        {"_id": ObjectId(client_id)}, {"$set": update_data}
    )
    
    return await client_collection.find_one({"_id": ObjectId(client_id)})


@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a client.
    """
    client_collection = db.get_database().clients
    
    # Check if client exists
    client = await client_collection.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    await client_collection.delete_one({"_id": ObjectId(client_id)})
    
    return {"message": "Client deleted successfully"}
```

# backend\app\api\endpoints\documents.py

```py
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
```

# backend\app\api\endpoints\health.py

```py
# backend/app/api/endpoints/health.py
from fastapi import APIRouter, Depends
from app.core.database import db

router = APIRouter()

@router.get("/")
async def health_root():
    """
    Root health endpoint for the API.
    """
    return {"status": "healthy", "message": "API is running"}

@router.get("/db")
async def health_db():
    """
    Check database connection.
    """
    status = "unknown"
    message = "Unknown database status"
    
    try:
        if db.client:
            # Try to ping the database
            await db.client.admin.command('ping')
            status = "healthy"
            message = "Database connection is working"
        else:
            status = "unhealthy"
            message = "Database client is not initialized"
    except Exception as e:
        status = "unhealthy"
        message = f"Database error: {str(e)}"
    
    return {
        "status": status,
        "message": message
    }
```

# backend\app\api\endpoints\meetings.py

```py
# backend/app/api/endpoints/meetings.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.meeting import MeetingCreate, MeetingUpdate, MeetingResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    meeting_in: MeetingCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new meeting.
    """
    meeting_collection = db.get_database().meetings
    client_collection = db.get_database().clients
    project_collection = db.get_database().projects
    
    # Verify client exists
    client = await client_collection.find_one({"_id": ObjectId(meeting_in.client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify project exists if provided
    if meeting_in.project_id:
        project = await project_collection.find_one({"_id": ObjectId(meeting_in.project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Create meeting document
    meeting_data = meeting_in.dict()
    meeting_data["created_at"] = meeting_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId
    meeting_data["client_id"] = ObjectId(meeting_data["client_id"])
    if meeting_data.get("project_id"):
        meeting_data["project_id"] = ObjectId(meeting_data["project_id"])
    
    # Insert into database
    result = await meeting_collection.insert_one(meeting_data)
    meeting_data["_id"] = result.inserted_id
    
    return meeting_data


@router.get("/", response_model=List[MeetingResponse])
async def read_meetings(
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[str] = None,
    project_id: Optional[str] = None,
    start_after: Optional[datetime] = None,
    start_before: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve meetings with optional filtering.
    """
    meeting_collection = db.get_database().meetings
    
    # Build query filter
    query = {}
    if client_id:
        query["client_id"] = ObjectId(client_id)
    if project_id:
        query["project_id"] = ObjectId(project_id)
    if start_after:
        query["start_time"] = {"$gte": start_after}
    if start_before:
        if "start_time" in query:
            query["start_time"]["$lte"] = start_before
        else:
            query["start_time"] = {"$lte": start_before}
    
    # Execute query
    meetings = await meeting_collection.find(query).sort("start_time", -1).skip(skip).limit(limit).to_list(length=limit)
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def read_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get meeting by ID.
    """
    meeting_collection = db.get_database().meetings
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: str,
    meeting_in: MeetingUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a meeting.
    """
    meeting_collection = db.get_database().meetings
    client_collection = db.get_database().clients
    project_collection = db.get_database().projects
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update fields
    update_data = meeting_in.dict(exclude_unset=True)
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
    
    # Handle attendees update if provided
    if update_data.get("attendees") is not None:
        # Replace the entire attendees array
        pass
    
    # Handle key_points update if provided
    if update_data.get("key_points") is not None:
        # Replace the entire key_points array
        pass
    
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": update_data}
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a meeting.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    await meeting_collection.delete_one({"_id": ObjectId(meeting_id)})
    
    return {"message": "Meeting deleted successfully"}


@router.post("/{meeting_id}/transcript", response_model=MeetingResponse)
async def add_transcript(
    meeting_id: str,
    transcript: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Add or update transcript for a meeting.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update transcript
    update_data = {
        "transcript": transcript,
        "updated_at": datetime.utcnow()
    }
    
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": update_data}
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})


@router.post("/{meeting_id}/key_points", response_model=MeetingResponse)
async def add_key_points(
    meeting_id: str,
    key_points: List[dict],
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Add key points from meeting transcript.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update key points
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)},
        {
            "$push": {"key_points": {"$each": key_points}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})


@router.post("/{meeting_id}/recording", response_model=MeetingResponse)
async def add_recording(
    meeting_id: str,
    recording_url: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Add or update recording URL for a meeting.
    """
    meeting_collection = db.get_database().meetings
    
    # Check if meeting exists
    meeting = await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Update recording URL
    update_data = {
        "recording_url": recording_url,
        "updated_at": datetime.utcnow()
    }
    
    await meeting_collection.update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": update_data}
    )
    
    return await meeting_collection.find_one({"_id": ObjectId(meeting_id)})
```

# backend\app\api\endpoints\organisations.py

```py
# backend/app/api/endpoints/organisations.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.organisation import OrganisationCreate, OrganisationUpdate, OrganisationResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=OrganisationResponse)
async def create_organisation(
    organisation_in: OrganisationCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new organisation.
    """
    organisation_collection = db.get_database().organisations
    
    # Check if organisation already exists with this name
    existing_org = await organisation_collection.find_one({"name": organisation_in.name})
    if existing_org:
        raise HTTPException(
            status_code=400,
            detail="An organisation with this name already exists."
        )
    
    # Create organisation document
    org_data = organisation_in.dict()
    org_data["created_at"] = org_data["updated_at"] = datetime.utcnow()
    
    # Insert into database
    result = await organisation_collection.insert_one(org_data)
    org_data["_id"] = result.inserted_id
    
    return org_data


@router.get("/", response_model=List[OrganisationResponse])
async def read_organisations(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve organisations.
    """
    organisation_collection = db.get_database().organisations
    organisations = await organisation_collection.find().skip(skip).limit(limit).to_list(length=limit)
    return organisations


@router.get("/{organisation_id}", response_model=OrganisationResponse)
async def read_organisation(
    organisation_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get organisation by ID.
    """
    organisation_collection = db.get_database().organisations
    organisation = await organisation_collection.find_one({"_id": ObjectId(organisation_id)})
    if not organisation:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return organisation


@router.put("/{organisation_id}", response_model=OrganisationResponse)
async def update_organisation(
    organisation_id: str,
    organisation_in: OrganisationUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update an organisation.
    """
    organisation_collection = db.get_database().organisations
    
    # Check if organisation exists
    organisation = await organisation_collection.find_one({"_id": ObjectId(organisation_id)})
    if not organisation:
        raise HTTPException(status_code=404, detail="Organisation not found")
    
    # Update fields
    update_data = organisation_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await organisation_collection.update_one(
        {"_id": ObjectId(organisation_id)}, {"$set": update_data}
    )
    
    return await organisation_collection.find_one({"_id": ObjectId(organisation_id)})


@router.delete("/{organisation_id}")
async def delete_organisation(
    organisation_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete an organisation.
    """
    organisation_collection = db.get_database().organisations
    client_collection = db.get_database().clients
    
    # Check if organisation exists
    organisation = await organisation_collection.find_one({"_id": ObjectId(organisation_id)})
    if not organisation:
        raise HTTPException(status_code=404, detail="Organisation not found")
    
    # Check if any clients are associated with this organisation
    clients_count = await client_collection.count_documents({"organisation_id": ObjectId(organisation_id)})
    if clients_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete organisation: {clients_count} clients are associated with it"
        )
    
    await organisation_collection.delete_one({"_id": ObjectId(organisation_id)})
    
    return {"message": "Organisation deleted successfully"}
```

# backend\app\api\endpoints\projects.py

```py
# backend/app/api/endpoints/projects.py
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson.objectid import ObjectId
from datetime import datetime

from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.database import db
from app.api.dependencies.auth import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new project.
    """
    project_collection = db.get_database().projects
    client_collection = db.get_database().clients
    organisation_collection = db.get_database().organisations
    
    # Verify client exists
    client = await client_collection.find_one({"_id": ObjectId(project_in.client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Verify organisation exists if provided
    if project_in.organisation_id:
        org = await organisation_collection.find_one({"_id": ObjectId(project_in.organisation_id)})
        if not org:
            raise HTTPException(status_code=404, detail="Organisation not found")
    
    # Create project document
    project_data = project_in.dict()
    project_data["created_at"] = project_data["updated_at"] = datetime.utcnow()
    
    # Convert string IDs to ObjectId
    project_data["client_id"] = ObjectId(project_data["client_id"])
    if project_data.get("organisation_id"):
        project_data["organisation_id"] = ObjectId(project_data["organisation_id"])
    
    # Insert into database
    result = await project_collection.insert_one(project_data)
    project_data["_id"] = result.inserted_id
    
    return project_data


@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[str] = None,
    organisation_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve projects with optional filtering.
    """
    project_collection = db.get_database().projects
    
    # Build query filter
    query = {}
    if client_id:
        query["client_id"] = ObjectId(client_id)
    if organisation_id:
        query["organisation_id"] = ObjectId(organisation_id)
    if status:
        query["status"] = status
    
    # Execute query
    projects = await project_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get project by ID.
    """
    project_collection = db.get_database().projects
    project = await project_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a project.
    """
    project_collection = db.get_database().projects
    client_collection = db.get_database().clients
    organisation_collection = db.get_database().organisations
    
    # Check if project exists
    project = await project_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    update_data = project_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Verify client exists if provided
    if update_data.get("client_id"):
        client = await client_collection.find_one({"_id": ObjectId(update_data["client_id"])})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        update_data["client_id"] = ObjectId(update_data["client_id"])
    
    # Verify organisation exists if provided
    if update_data.get("organisation_id"):
        org = await organisation_collection.find_one({"_id": ObjectId(update_data["organisation_id"])})
        if not org:
            raise HTTPException(status_code=404, detail="Organisation not found")
        update_data["organisation_id"] = ObjectId(update_data["organisation_id"])
    
    await project_collection.update_one(
        {"_id": ObjectId(project_id)}, {"$set": update_data}
    )
    
    return await project_collection.find_one({"_id": ObjectId(project_id)})


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a project.
    """
    project_collection = db.get_database().projects
    document_collection = db.get_database().documents
    meeting_collection = db.get_database().meetings
    
    # Check if project exists
    project = await project_collection.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check for related documents
    documents_count = await document_collection.count_documents({"project_id": ObjectId(project_id)})
    if documents_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete project: {documents_count} documents are associated with it"
        )
    
    # Check for related meetings
    meetings_count = await meeting_collection.count_documents({"project_id": ObjectId(project_id)})
    if meetings_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete project: {meetings_count} meetings are associated with it"
        )
    
    await project_collection.delete_one({"_id": ObjectId(project_id)})
    
    return {"message": "Project deleted successfully"}
```

# backend\app\core\auth.py

```py
# backend/app/core/auth.py
from datetime import datetime, timedelta
from typing import Any, Optional, Union

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hash a password for storing
    """
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt
```

# backend\app\core\config.py

```py
# backend/app/core/config.py
import os
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Rogue Drones Workflow API"
    
    # CORS Settings
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "http://localhost:4200", "http://localhost:7500", "http://localhost:19876"]
    
    # MongoDB Settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://admin:password@mongodb:27017/")
    DATABASE_NAME: str = "rogue_drones"
    
    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change_this_to_a_secure_secret")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Google API Settings
    GOOGLE_CLIENT_ID: Union[str, None] = None
    GOOGLE_CLIENT_SECRET: Union[str, None] = None
    
    # Anthropic Claude API
    ANTHROPIC_API_KEY: Union[str, None] = None
    
    @validator("MONGODB_URL", pre=True)
    def assemble_mongodb_connection(cls, v: Union[str, None]) -> str:
        if not v:
            raise ValueError("MongoDB URL must be provided")
        return v
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
```

# backend\app\core\database.py

```py
# backend/app/core/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    
    async def connect_to_mongodb(self):
        """
        Connect to the MongoDB database
        """
        self.client = AsyncIOMotorClient(settings.MONGODB_URL)
        
    async def close_mongodb_connection(self):
        """
        Close the MongoDB connection
        """
        if self.client:
            self.client.close()
            
    def get_database(self):
        """
        Get the database instance
        """
        return self.client[settings.DATABASE_NAME]

db = Database()
```

# backend\app\core\init_db.py

```py
# backend/app/core/init_db.py
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING, TEXT
from app.core.config import settings

async def create_indexes(db: AsyncIOMotorClient) -> None:
    """
    Create indexes for MongoDB collections to optimize performance.
    """
    # Get database
    database = db[settings.DATABASE_NAME]
    
    # User indexes
    await database.users.create_index("email", unique=True)
    
    # Client indexes
    await database.clients.create_index("email", unique=True)
    await database.clients.create_index("organisation_id")
    await database.clients.create_index([("name", TEXT), ("email", TEXT)], 
                                       name="client_text_search")
    
    # Organisation indexes
    await database.organisations.create_index("name", unique=True)
    await database.organisations.create_index([("name", TEXT), ("industry", TEXT), 
                                              ("location", TEXT)], 
                                             name="org_text_search")
    
    # Project indexes
    await database.projects.create_index("client_id")
    await database.projects.create_index("organisation_id")
    await database.projects.create_index("status")
    await database.projects.create_index([("title", TEXT), ("description", TEXT)], 
                                        name="project_text_search")
    
    # Document indexes
    await database.documents.create_index("client_id")
    await database.documents.create_index("project_id")
    await database.documents.create_index("document_type")
    await database.documents.create_index("status")
    await database.documents.create_index("created_by")
    await database.documents.create_index([("title", TEXT)], 
                                         name="document_text_search")
    
    # Meeting indexes
    await database.meetings.create_index("client_id")
    await database.meetings.create_index("project_id")
    await database.meetings.create_index("start_time")
    await database.meetings.create_index([("title", TEXT), ("description", TEXT)], 
                                        name="meeting_text_search")

async def init_db(db: AsyncIOMotorClient) -> None:
    """
    Initialize database with indexes and any required initial data.
    """
    await create_indexes(db)
```

# backend\app\main.py

```py
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.core.config import settings
from app.core.database import db
from app.core.init_db import init_db

app = FastAPI(
    title="Rogue Drones Client Workflow API",
    description="API for the Rogue Drones client workflow system",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:19876",   # ← your Next.js dev URL
        # (you can add http://localhost:3000 if you run on the default Next port,
        #  or your production domain here too)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health endpoints (before any DB connections)
@app.get("/")
async def root():
    """
    Root endpoint to verify the API is running.
    """
    return {"message": "Rogue Drones API is running"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the API is running.
    """
    return {"status": "healthy"}

# Event handlers for database connection
@app.on_event("startup")
async def startup_db_client():
    try:
        await db.connect_to_mongodb()
        await init_db(db.get_database())
        print("Successfully connected to MongoDB")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        # Don't raise - let the app start anyway for debugging

@app.on_event("shutdown")
async def shutdown_db_client():
    await db.close_mongodb_connection()

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

# backend\app\models\client.py

```py
# backend/app/models/client.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class Client(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    email: EmailStr
    phone: Optional[str] = None
    organisation_id: Optional[PyObjectId] = None
    notes: Optional[str] = None
    initial_query: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
```

# backend\app\models\document.py

```py
# backend/app/models/document.py
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class DocumentVersion(BaseModel):
    version_number: int
    content: str
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    
    # Pydantic v2 config
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Document(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    document_type: str
    client_id: PyObjectId
    project_id: Optional[PyObjectId] = None
    status: str = "draft"
    current_version: int = 1
    versions: List[DocumentVersion] = []
    requires_signature: bool = False
    signed: bool = False
    signed_at: Optional[datetime] = None
    signed_by: Optional[PyObjectId] = None
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
```

# backend\app\models\meeting.py

```py
# backend/app/models/meeting.py
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class MeetingAttendee(BaseModel):
    name: str
    email: Optional[str] = None
    organisation: Optional[str] = None
    role: Optional[str] = None
    
    # Pydantic v2 config
    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )

class KeyPoint(BaseModel):
    content: str
    category: Optional[str] = None  # e.g., "requirement", "concern", "question"
    
    # Pydantic v2 config
    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )

class Meeting(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    client_id: PyObjectId
    project_id: Optional[PyObjectId] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    virtual: bool = True
    meeting_url: Optional[HttpUrl] = None
    attendees: List[MeetingAttendee] = []
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    key_points: List[KeyPoint] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
```

# backend\app\models\organisation.py

```py
# backend/app/models/organisation.py
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, Field, HttpUrl, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class Organisation(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    social_media: Optional[Dict[str, HttpUrl]] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
```

# backend\app\models\project.py

```py
# backend/app/models/project.py
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from app.utils.object_id import PyObjectId

class Milestone(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: bool = False
    completed_at: Optional[datetime] = None
    
    # Pydantic v2 config
    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )

class Project(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    client_id: PyObjectId
    organisation_id: Optional[PyObjectId] = None
    status: str = "assessment"
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    milestones: List[Milestone] = []
    assessment_score: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Pydantic v2 config
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
```

# backend\app\models\user.py

```py
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
```

# backend\app\schemas\client.py

```py
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
```

# backend\app\schemas\document.py

```py
# backend/app/schemas/document.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class DocumentVersionBase(BaseModel):
    version_number: int
    content: str
    created_by: str
    notes: Optional[str] = None


class DocumentVersionCreate(DocumentVersionBase):
    pass


class DocumentVersionResponse(DocumentVersionBase):
    created_at: datetime


class DocumentBase(BaseModel):
    title: str
    document_type: str
    client_id: str
    project_id: Optional[str] = None
    status: str = "draft"
    requires_signature: bool = False


class DocumentCreate(DocumentBase):
    content: str  # Initial content for version 1


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    status: Optional[str] = None
    requires_signature: Optional[bool] = None
    new_version_content: Optional[str] = None
    new_version_notes: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: str = Field(..., alias="_id")
    current_version: int
    versions: List[DocumentVersionResponse]
    signed: bool
    signed_at: Optional[datetime] = None
    signed_by: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class DocumentInDB(DocumentResponse):
    pass
```

# backend\app\schemas\meeting.py

```py
# backend/app/schemas/meeting.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class MeetingAttendeeBase(BaseModel):
    name: str
    email: Optional[str] = None
    organisation: Optional[str] = None
    role: Optional[str] = None


class MeetingAttendeeCreate(MeetingAttendeeBase):
    pass


class MeetingAttendeeResponse(MeetingAttendeeBase):
    pass


class KeyPointBase(BaseModel):
    content: str
    category: Optional[str] = None


class KeyPointCreate(KeyPointBase):
    pass


class KeyPointResponse(KeyPointBase):
    pass


class MeetingBase(BaseModel):
    title: str
    description: Optional[str] = None
    client_id: str
    project_id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    virtual: bool = True
    meeting_url: Optional[HttpUrl] = None
    notes: Optional[str] = None


class MeetingCreate(MeetingBase):
    attendees: List[MeetingAttendeeCreate] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    virtual: Optional[bool] = None
    meeting_url: Optional[HttpUrl] = None
    attendees: Optional[List[MeetingAttendeeCreate]] = None
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    key_points: Optional[List[KeyPointCreate]] = None
    notes: Optional[str] = None


class MeetingResponse(MeetingBase):
    id: str = Field(..., alias="_id")
    attendees: List[MeetingAttendeeResponse] = []
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    key_points: List[KeyPointResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class MeetingInDB(MeetingResponse):
    pass
```

# backend\app\schemas\organisation.py

```py
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
```

# backend\app\schemas\project.py

```py
# backend/app/schemas/project.py
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: bool = False
    completed_at: Optional[datetime] = None


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None
    completed_at: Optional[datetime] = None


class MilestoneResponse(MilestoneBase):
    pass


class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    client_id: str
    organisation_id: Optional[str] = None
    status: str = "assessment"
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    assessment_score: Optional[int] = None
    notes: Optional[str] = None


class ProjectCreate(ProjectBase):
    milestones: List[MilestoneCreate] = []


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[str] = None
    organisation_id: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    assessment_score: Optional[int] = None
    notes: Optional[str] = None
    milestones: Optional[List[MilestoneCreate]] = None


class ProjectResponse(ProjectBase):
    id: str = Field(..., alias="_id")
    milestones: List[MilestoneResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
    )


class ProjectInDB(ProjectResponse):
    pass
```

# backend\app\schemas\token.py

```py
# backend/app/schemas/token.py
from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
```

# backend\app\schemas\user.py

```py
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
```

# backend\app\services\user.py

```py
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
```

# backend\app\utils\object_id.py

```py
# backend/app/utils/object_id.py
from typing import Any, Annotated
from bson import ObjectId
from pydantic import GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema

class PyObjectId(ObjectId):
    """
    Custom ObjectId class for Pydantic v2 compatibility
    """
    
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> core_schema.CoreSchema:
        """
        Define how to handle ObjectId validation in Pydantic v2
        """
        return core_schema.union_schema([
            # Accept ObjectId instances directly
            core_schema.is_instance_schema(ObjectId),
            # Convert strings to ObjectId
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ]),
        ])
    
    @classmethod
    def __get_pydantic_json_schema__(
        cls, _schema_generator: GetJsonSchemaHandler, _field_schema: JsonSchemaValue
    ) -> JsonSchemaValue:
        """
        Define the JSON schema for ObjectId in Pydantic v2
        This replaces the old __modify_schema__ method
        """
        # Update the JSON schema to indicate this is a string
        _field_schema.update({"type": "string"})
        return _field_schema
    
    @classmethod
    def validate(cls, value):
        """
        Validate that the given value is a valid ObjectId
        """
        if not ObjectId.is_valid(value):
            raise ValueError("Invalid ObjectId")
        return ObjectId(value)
```

# backend\Dockerfile

```
# backend/Dockerfile
FROM python:3.10.12-slim-bullseye

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port 8000 (internal container port)
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

# backend\requirements.txt

```txt
# backend/requirements.txt
fastapi==0.104.1
uvicorn==0.23.2
pydantic==2.4.2
pydantic-settings==2.0.3
pydantic-core==2.10.1
motor==3.2.0
pymongo==4.12.1
python-jose==3.3.0
passlib==1.7.4
bcrypt==4.0.1
python-multipart==0.0.6
email-validator==2.0.0.post2
httpx==0.25.1
python-dotenv==1.0.0
jinja2==3.1.2
dnspython-2.7.0
```

# backend\tests\conftest.py

```py
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
```

# backend\tests\requirements.txt

```txt
# backend/tests/requirements.txt
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.1
```

# backend\tests\test_auth.py

```py
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
```

# backend\tests\test_clients.py

```py
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
```

# docker-compose.override.yml

```yml
# docker-compose.override.yml
services:
  backend:
    command: uvicorn app.main:app --host 0.0.0.0 --port 9090 --reload
    volumes:
      - ./backend/app:/app/app
      - ./backend/requirements.txt:/app/requirements.txt
    ports:
      - "9091:9090" # Maps host port 9091 to container port 8000

```

# docker-compose.yml

```yml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    networks:
      - rogue-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend
    ports:
      - "9091:9090"  # Maps host port 9091 to container port 9090
    volumes:
      - ./backend:/app
    depends_on:
      - mongodb
    environment:
      - MONGODB_URL=mongodb://admin:password@mongodb:27017/
      - JWT_SECRET=change_this_to_a_secure_secret
      - JWT_ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=30
      - ENVIRONMENT=development
    networks:
      - rogue-network
    restart: always  # Add restart policy for better resilience

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: frontend
    ports:
      - "4200:3000"  # Maps host port 4200 to container port 3000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:9090
    networks:
      - rogue-network
    restart: always  # Add restart policy

networks:
  rogue-network:
    driver: bridge

volumes:
  mongodb_data:
```

# frontend\components\ApiHealthCheck.tsx

```tsx
// frontend/components/ApiHealthCheck.tsx
import { useEffect, useState } from 'react';

interface ApiHealthCheckProps {
  onHealthCheckResult?: (isHealthy: boolean) => void;
}

export default function ApiHealthCheck({ onHealthCheckResult }: ApiHealthCheckProps) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
    setApiUrl(url);

    const checkHealth = async () => {
      try {
        console.log(`Checking API health at ${url}/health`);
        const response = await fetch(`${url}/health`, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          console.log('API is healthy');
          setIsHealthy(true);
          if (onHealthCheckResult) onHealthCheckResult(true);
        } else {
          console.error('API health check failed:', response.status);
          setIsHealthy(false);
          setError(`API returned status ${response.status}`);
          if (onHealthCheckResult) onHealthCheckResult(false);
        }
      } catch (err) {
        console.error('API health check error:', err);
        setIsHealthy(false);
        setError('Cannot connect to API');
        if (onHealthCheckResult) onHealthCheckResult(false);
      }
    };

    checkHealth();
  }, [onHealthCheckResult]);

  if (isHealthy === null) {
    return null; // Still checking
  }

  if (isHealthy === true) {
    return null; // API is healthy, no need to display anything
  }

  // API is not healthy, show error
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold">API Connection Error</p>
          <p className="text-sm">{error || 'Cannot connect to the backend API'}</p>
          <p className="text-sm mt-1">
            Please ensure the backend is running at <span className="font-mono">{apiUrl}</span>
          </p>
          <div className="mt-2">
            <p className="text-sm font-semibold">Troubleshooting steps:</p>
            <ul className="list-disc list-inside text-sm ml-2 mt-1">
              <li>Check if the backend container is running</li>
              <li>Verify there are no CORS issues</li>
              <li>Ensure the API URL is correct in your .env.local file</li>
              <li>Check for any network issues or firewall restrictions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

# frontend\components\clients\ClientDetail.tsx

```tsx
// frontend/components/clients/ClientDetail.tsx
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Client, Organisation, Project, Meeting, Document } from '../../types';
import { formatDate, formatShortDate, formatDateTime } from '../../lib/utils/dateUtils';
import { clientApi, organisationApi, projectApi, meetingApi, documentApi } from '../../lib/api';
import { useApiStatus, withApiStatus } from '../../hooks/useApiStatus';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';

// Tab enum for managing selected tab state
enum TabType {
  INFO = 'info',
  PROJECTS = 'projects',
  MEETINGS = 'meetings',
  DOCUMENTS = 'documents',
}

interface ClientDetailProps {
  clientId: string;
}

const ClientDetail: React.FC<ClientDetailProps> = ({ clientId }) => {
  // State management
  const [client, setClient] = useState<Client | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.INFO);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    client: true,
    organisation: false,
    projects: false,
    meetings: false,
    documents: false,
  });
  
  const { status, error, setStatus, setError } = useApiStatus();

  // Fetch client data
  useEffect(() => {
    const fetchClientData = async () => {
      setIsLoading({ ...isLoading, client: true });
      
      const result = await withApiStatus(
        () => clientApi.getClient(clientId),
        { setStatus, setError }
      );

      if (result) {
        setClient(result);
        setIsLoading({ ...isLoading, client: false });
        
        // If client has an organisation_id, fetch the organisation details
        if (result.organisation_id) {
          setIsLoading({ ...isLoading, organisation: true });
          try {
            const org = await organisationApi.getOrganisation(result.organisation_id);
            setOrganisation(org);
          } catch (error) {
            console.error('Failed to fetch organisation details:', error);
          } finally {
            setIsLoading({ ...isLoading, organisation: false });
          }
        }
      } else {
        setIsLoading({ ...isLoading, client: false });
      }
    };

    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  // Fetch projects when projects tab is selected
  useEffect(() => {
    const fetchProjects = async () => {
      if (activeTab === TabType.PROJECTS && clientId && !projects.length) {
        setIsLoading({ ...isLoading, projects: true });
        
        try {
          const fetchedProjects = await projectApi.getProjects(clientId);
          setProjects(fetchedProjects);
        } catch (error) {
          console.error('Failed to fetch projects:', error);
        } finally {
          setIsLoading({ ...isLoading, projects: false });
        }
      }
    };

    fetchProjects();
  }, [activeTab, clientId, projects.length]);

  // Fetch meetings when meetings tab is selected
  useEffect(() => {
    const fetchMeetings = async () => {
      if (activeTab === TabType.MEETINGS && clientId && !meetings.length) {
        setIsLoading({ ...isLoading, meetings: true });
        
        try {
          const fetchedMeetings = await meetingApi.getMeetings(clientId);
          setMeetings(fetchedMeetings);
        } catch (error) {
          console.error('Failed to fetch meetings:', error);
        } finally {
          setIsLoading({ ...isLoading, meetings: false });
        }
      }
    };

    fetchMeetings();
  }, [activeTab, clientId, meetings.length]);

  // Fetch documents when documents tab is selected
  useEffect(() => {
    const fetchDocuments = async () => {
      if (activeTab === TabType.DOCUMENTS && clientId && !documents.length) {
        setIsLoading({ ...isLoading, documents: true });
        
        try {
          const fetchedDocuments = await documentApi.getDocuments(clientId);
          setDocuments(fetchedDocuments);
        } catch (error) {
          console.error('Failed to fetch documents:', error);
        } finally {
          setIsLoading({ ...isLoading, documents: false });
        }
      }
    };

    fetchDocuments();
  }, [activeTab, clientId, documents.length]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Loading state
  if (isLoading.client) {
    return (
      <div className="p-8">
        <LoadingSpinner size="large" text="Loading client information..." />
      </div>
    );
  }

  // Error state
  if (!client) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> Failed to load client information.</span>
        <p className="mt-2">{error?.message || 'Client not found'}</p>
        <div className="mt-4">
          <Link href="/clients" className="text-red-700 underline">
            Return to clients list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Client header */}
      <div className="bg-blue-700 text-white p-4">
        <h2 className="text-2xl font-bold">{client.name}</h2>
        <div className="flex mt-2 text-sm">
          <div className="mr-6">
            <span className="opacity-75">Email:</span>{' '}
            <a href={`mailto:${client.email}`} className="underline">
              {client.email}
            </a>
          </div>
          {client.phone && (
            <div>
              <span className="opacity-75">Phone:</span> {client.phone}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => handleTabChange(TabType.INFO)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.INFO
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => handleTabChange(TabType.PROJECTS)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.PROJECTS
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => handleTabChange(TabType.MEETINGS)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.MEETINGS
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Meetings
          </button>
          <button
            onClick={() => handleTabChange(TabType.DOCUMENTS)}
            className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
              activeTab === TabType.DOCUMENTS
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* Info tab */}
        {activeTab === TabType.INFO && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Client Details</h3>
                <dl>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client.name}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                        {client.email}
                      </a>
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {client.phone || 'Not provided'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Organisation</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {isLoading.organisation ? (
                        <span className="text-gray-500">Loading...</span>
                      ) : organisation ? (
                        <Link href={`/organisations/${organisation._id}`} className="text-blue-600 hover:underline">
                          {organisation.name}
                        </Link>
                      ) : (
                        'Not associated with any organisation'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                <dl>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(client.created_at)}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 rounded-md mb-3">
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatDate(client.updated_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Initial Query */}
            {client.initial_query && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Initial Query</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{client.initial_query}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects tab */}
        {activeTab === TabType.PROJECTS && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Projects</h3>
              <Link
                href={`/projects/new?client_id=${clientId}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Add New Project
              </Link>
            </div>

            {isLoading.projects ? (
              <div className="py-8">
                <LoadingSpinner text="Loading projects..." />
              </div>
            ) : projects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budget
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projects.map((project) => (
                      <tr key={project._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/projects/${project._id}`} className="text-blue-600 hover:underline">
                            {project.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.start_date ? formatShortDate(project.start_date) : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.end_date ? formatShortDate(project.end_date) : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/projects/${project._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Edit
                          </Link>
                          <Link href={`/projects/${project._id}`} className="text-blue-600 hover:text-blue-900">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <p className="text-gray-500">No projects found for this client.</p>
                <Link
                  href={`/projects/new?client_id=${clientId}`}
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  Create the first project
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Meetings tab */}
        {activeTab === TabType.MEETINGS && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Meetings</h3>
              <Link
                href={`/meetings/new?client_id=${clientId}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Schedule Meeting
              </Link>
            </div>

            {isLoading.meetings ? (
              <div className="py-8">
                <LoadingSpinner text="Loading meetings..." />
              </div>
            ) : meetings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {meetings.map((meeting) => (
                      <tr key={meeting._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/meetings/${meeting._id}`} className="text-blue-600 hover:underline">
                            {meeting.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(meeting.start_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {meeting.virtual 
                            ? 'Virtual'
                            : meeting.location || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {meeting.project_id ? (
                            <Link href={`/projects/${meeting.project_id}`} className="text-blue-600 hover:underline">
                              View Project
                            </Link>
                          ) : (
                            'Not specified'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/meetings/${meeting._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Edit
                          </Link>
                          <Link href={`/meetings/${meeting._id}`} className="text-blue-600 hover:text-blue-900">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <p className="text-gray-500">No meetings scheduled with this client.</p>
                <Link
                  href={`/meetings/new?client_id=${clientId}`}
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  Schedule a meeting
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Documents tab */}
        {activeTab === TabType.DOCUMENTS && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <Link
                href={`/documents/new?client_id=${clientId}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Create Document
              </Link>
            </div>

            {isLoading.documents ? (
              <div className="py-8">
                <LoadingSpinner text="Loading documents..." />
              </div>
            ) : documents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documents.map((document) => (
                      <tr key={document._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/documents/${document._id}`} className="text-blue-600 hover:underline">
                            {document.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.document_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={document.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          v{document.current_version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.project_id ? (
                            <Link href={`/projects/${document.project_id}`} className="text-blue-600 hover:underline">
                              View Project
                            </Link>
                          ) : (
                            'Not specified'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatShortDate(document.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/documents/${document._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            Edit
                          </Link>
                          <Link href={`/documents/${document._id}`} className="text-blue-600 hover:text-blue-900">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 text-center rounded-lg">
                <p className="text-gray-500">No documents found for this client.</p>
                <Link
                  href={`/documents/new?client_id=${clientId}`}
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  Create a document
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetail;
```

# frontend\components\clients\ClientForm.tsx

```tsx
// frontend/components/clients/ClientForm.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import { Client, ClientCreate, ClientUpdate, Organisation } from '../../types/client';
import { clientApi } from '../../lib/api/clientApi';
import { organisationApi } from '../../lib/api/organisationApi';
import { useApiStatus, withApiStatus } from '../../hooks/useApiStatus';

interface ClientFormProps {
  client?: Client;
  isEditing?: boolean;
}

export default function ClientForm({ client, isEditing = false }: ClientFormProps) {
  const router = useRouter();
  const { status, isLoading, isError, error, setStatus, setError } = useApiStatus();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset 
  } = useForm<ClientCreate>({
    defaultValues: client ? {
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      organisation_id: client.organisation_id || '',
      notes: client.notes || '',
      initial_query: client.initial_query || ''
    } : {}
  });

  // Load organisations for the dropdown
  useEffect(() => {
    const fetchOrganisations = async () => {
      const result = await withApiStatus(
        () => organisationApi.getOrganisations(),
        { setStatus, setError }
      );
      
      if (result) {
        setOrganisations(result);
      }
    };

    fetchOrganisations();

    // Reset form with client data if in edit mode
    if (client && isEditing) {
      reset({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        organisation_id: client.organisation_id || '',
        notes: client.notes || '',
        initial_query: client.initial_query || ''
      });
    }
  }, [client, isEditing, reset]);

  const onSubmit = async (data: ClientCreate) => {
    // Clean up empty strings to undefined for optional fields
    const clientData = {
      ...data,
      phone: data.phone || undefined,
      organisation_id: data.organisation_id || undefined,
      notes: data.notes || undefined,
      initial_query: data.initial_query || undefined
    };

    let result;
    if (isEditing && client) {
      // Update existing client
      result = await withApiStatus(
        () => clientApi.updateClient(client._id, clientData as ClientUpdate),
        { setStatus, setError }
      );
    } else {
      // Create new client
      result = await withApiStatus(
        () => clientApi.createClient(clientData),
        { setStatus, setError }
      );
    }

    if (result) {
      // Redirect to client detail page on success
      router.push(`/clients/${result._id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Error message */}
      {isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error?.message || 'An error occurred while saving the client.'}</p>
        </div>
      )}

      {/* Name field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : ''
          }`}
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Email field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : ''
          }`}
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Phone field */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          id="phone"
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('phone')}
        />
      </div>

      {/* Organisation field */}
      <div>
        <label htmlFor="organisation_id" className="block text-sm font-medium text-gray-700">
          Organisation
        </label>
        <select
          id="organisation_id"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('organisation_id')}
        >
          <option value="">-- Select Organisation --</option>
          {organisations.map((org) => (
            <option key={org._id} value={org._id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notes field */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('notes')}
        ></textarea>
      </div>

      {/* Initial Query field */}
      <div>
        <label htmlFor="initial_query" className="block text-sm font-medium text-gray-700">
          Initial Query
        </label>
        <textarea
          id="initial_query"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          {...register('initial_query')}
        ></textarea>
      </div>

      {/* Form actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </form>
  );
}
```

# frontend\components\common\LoadingSpinner.tsx

```tsx
// frontend/components/common/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text = 'Loading...', 
  className = '' 
}) => {
  // Determine spinner size based on prop
  const spinnerSize = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }[size];

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 ${spinnerSize}`}></div>
      {text && <span className="ml-3 text-gray-700">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
```

# frontend\components\common\StatusBadge.tsx

```tsx
// frontend/components/common/StatusBadge.tsx
import React from 'react';

type StatusType = 'draft' | 'pending' | 'in_progress' | 'completed' | 'signed' | 'assessment' | 'default';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  // Map status to a normalized status type
  const normalizedStatus = getNormalizedStatus(status);
  
  // Map status type to color scheme
  const colorScheme = getColorScheme(normalizedStatus);
  
  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorScheme} ${className}`}
    >
      {status}
    </span>
  );
};

// Helper function to normalize various status strings
function getNormalizedStatus(status: string): StatusType {
  const normalized = status.toLowerCase();
  
  if (normalized.includes('draft')) return 'draft';
  if (normalized.includes('pend') || normalized.includes('wait')) return 'pending';
  if (normalized.includes('progress') || normalized.includes('active')) return 'in_progress';
  if (normalized.includes('complete') || normalized.includes('done') || normalized.includes('finish')) return 'completed';
  if (normalized.includes('sign')) return 'signed';
  if (normalized.includes('assess')) return 'assessment';
  
  return 'default';
}

// Helper function to map status type to color scheme
function getColorScheme(status: StatusType): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'signed':
      return 'bg-green-100 text-green-800';
    case 'assessment':
      return 'bg-yellow-100 text-yellow-800';
    case 'default':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default StatusBadge;
```

# frontend\components\Layout.tsx

```tsx
// frontend/components/Layout.tsx
import React, { ReactNode, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './common/LoadingSpinner';

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ 
  children, 
  title = 'Rogue Drones Client Workflow' 
}: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // If auth context is loading, show a loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner size="large" text="Loading..." />
      </div>
    );
  }

  // If no user and not on login/register page, redirect is handled by AuthContext
  // We just don't render anything here
  if (!user && !router.pathname.includes('/login') && !router.pathname.includes('/register')) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  // Don't render the layout for login/register pages
  if (router.pathname === '/login' || router.pathname === '/register') {
    return (
      <>
        <Head>
          <title>{title}</title>
          <meta name="description" content="Client workflow management system for Rogue Drones" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Client workflow management system for Rogue Drones" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="font-bold text-xl">
                Rogue Drones
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              <Link href="/clients" className="hover:text-blue-200">
                Clients
              </Link>
              <Link href="/projects" className="hover:text-blue-200">
                Projects
              </Link>
              <Link href="/meetings" className="hover:text-blue-200">
                Meetings
              </Link>
              <Link href="/documents" className="hover:text-blue-200">
                Documents
              </Link>
              <Link href="/organisations" className="hover:text-blue-200">
                Organizations
              </Link>
            </nav>

            {/* User menu */}
            <div className="flex items-center">
              {user && (
                <span className="mr-4 hidden md:inline">{user.first_name} {user.last_name}</span>
              )}
              <button
                onClick={handleLogout}
                className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="pt-4 pb-2 md:hidden">
              <Link
                href="/clients"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Clients
              </Link>
              <Link
                href="/projects"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Projects
              </Link>
              <Link
                href="/meetings"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Meetings
              </Link>
              <Link
                href="/documents"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Documents
              </Link>
              <Link
                href="/organisations"
                className="block py-2 hover:text-blue-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Organizations
              </Link>
              {user && (
                <div className="py-2 text-sm text-blue-200">{user.first_name} {user.last_name}</div>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow bg-gray-50">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">
                &copy; {new Date().getFullYear()} Rogue Drones. All rights reserved.
              </p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-300 hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-300 hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-gray-300 hover:text-white">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

# frontend\context\AuthContext.tsx

```tsx
// frontend/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// Define the User interface
interface User {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
}

// Define the Auth context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create the Auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Create the Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
  
  // Public routes that don't need redirect to login
  const publicRoutes = ['/login', '/register'];

  // Check if the user is already logged in on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      // If no token and not on a public route, redirect to login
      if (!token) {
        setLoading(false);
        setUser(null);
        
        // Only redirect if not already on a public route
        if (!publicRoutes.includes(router.pathname)) {
          router.push('/login');
        }
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUser(response.data);
        setError(null);
        
        // If authenticated and on login page, redirect to home
        if (publicRoutes.includes(router.pathname)) {
          router.push('/');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // Clear token if invalid
        localStorage.removeItem('token');
        setUser(null);
        
        // Redirect to login if not already there
        if (!publicRoutes.includes(router.pathname)) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [API_URL, router.pathname]);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Convert email/password to FormData for OAuth2 compatibility
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await axios.post(
        `${API_URL}/api/v1/auth/login`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Save token to localStorage
      localStorage.setItem('token', response.data.access_token);

      // Fetch user info
      const userResponse = await axios.get(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`
        }
      });

      setUser(userResponse.data);
      router.push('/');
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response) {
        if (err.response.status === 401) {
          setError('Invalid email or password');
        } else if (err.response.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError(`Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        setError('No response from server. Please check if the backend is running.');
      } else {
        setError(err.message || 'An error occurred during login. Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the Auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

# frontend\Dockerfile

```
# frontend/Dockerfile
FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "dev"]
```

# frontend\hooks\useApiStatus.ts

```ts
// frontend/hooks/useApiStatus.ts
import { useState } from 'react';

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseApiStatusReturn {
  status: ApiStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  setStatus: (status: ApiStatus) => void;
  error: Error | null;
  setError: (error: Error | null) => void;
}

export const useApiStatus = (initialStatus: ApiStatus = 'idle'): UseApiStatusReturn => {
  const [status, setStatus] = useState<ApiStatus>(initialStatus);
  const [error, setError] = useState<Error | null>(null);

  return {
    status,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    setStatus,
    error,
    setError,
  };
};

// Helper function to handle api calls with status tracking
export const withApiStatus = async <T extends any>(
  apiCall: () => Promise<T>,
  { setStatus, setError }: Pick<UseApiStatusReturn, 'setStatus' | 'setError'>
): Promise<T | null> => {
  try {
    setStatus('loading');
    setError(null);
    const data = await apiCall();
    setStatus('success');
    return data;
  } catch (err) {
    setStatus('error');
    setError(err instanceof Error ? err : new Error(String(err)));
    return null;
  }
};
```

# frontend\lib\api\apiClient.ts

```ts
// frontend/lib/api/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';

// Create a base API client that handles auth and errors
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 10000,
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // If token exists, add it to headers
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      console.log(`Making request to: ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  client.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response) {
        // Handle 401 Unauthorized errors by redirecting to login
        if (error.response.status === 401) {
          console.error('Unauthorized: Token might be expired');
          
          // If we're in a browser environment
          if (typeof window !== 'undefined') {
            // Clear token
            localStorage.removeItem('token');
            
            // Redirect to login
            window.location.href = '/login';
          }
        }
      }
      
      return Promise.reject(error);
    }
  );

  return client;
};

// Create a singleton instance of the API client
export const apiClient = createApiClient();
```

# frontend\lib\api\clientApi.ts

```ts
// frontend/lib/api/clientApi.ts
import { Client, ClientCreate, ClientUpdate } from '../../types/client';
import { apiClient } from './apiClient';

const API_PATH = '/api/v1/clients';

export const clientApi = {
  // Fetch all clients
  async getClients(): Promise<Client[]> {
    const response = await apiClient.get(`${API_PATH}/`);
    return response.data;
  },

  // Fetch a single client by ID
  async getClient(id: string): Promise<Client> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new client
  async createClient(client: ClientCreate): Promise<Client> {
    const response = await apiClient.post(`${API_PATH}/`, client);
    return response.data;
  },

  // Update an existing client
  async updateClient(id: string, client: ClientUpdate): Promise<Client> {
    const response = await apiClient.put(`${API_PATH}/${id}`, client);
    return response.data;
  },

  // Delete a client
  async deleteClient(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  }
};
```

# frontend\lib\api\documentApi.ts

```ts
// frontend/lib/api/documentApi.ts
import { Document, DocumentCreate, DocumentUpdate } from '../../types/document';
import { apiClient } from './apiClient';

const API_PATH = '/api/v1/documents';

export const documentApi = {
  // Fetch all documents
  async getDocuments(clientId?: string, projectId?: string, documentType?: string, status?: string): Promise<Document[]> {
    const params: Record<string, string> = {};
    if (clientId) params['client_id'] = clientId;
    if (projectId) params['project_id'] = projectId;
    if (documentType) params['document_type'] = documentType;
    if (status) params['status'] = status;
    
    const response = await apiClient.get(`${API_PATH}/`, { params });
    return response.data;
  },

  // Fetch a single document by ID
  async getDocument(id: string): Promise<Document> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new document
  async createDocument(document: DocumentCreate): Promise<Document> {
    const response = await apiClient.post(`${API_PATH}/`, document);
    return response.data;
  },

  // Update an existing document
  async updateDocument(id: string, document: DocumentUpdate): Promise<Document> {
    const response = await apiClient.put(`${API_PATH}/${id}`, document);
    return response.data;
  },

  // Delete a document
  async deleteDocument(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  },
  
  // Sign a document
  async signDocument(id: string): Promise<Document> {
    const response = await apiClient.post(`${API_PATH}/${id}/sign`);
    return response.data;
  }
};
```

# frontend\lib\api\index.ts

```ts
// frontend/lib/api/index.ts
// Re-export all API functions from a single file for easier imports
export * from './clientApi';
export * from './organisationApi';
export * from './projectApi';
export * from './meetingApi';
export * from './documentApi';
```

# frontend\lib\api\meetingApi.ts

```ts
// frontend/lib/api/meetingApi.ts
import { Meeting, MeetingCreate, MeetingUpdate } from '../../types/meeting';
import { apiClient } from './apiClient';

const API_PATH = '/api/v1/meetings';

export const meetingApi = {
  // Fetch all meetings
  async getMeetings(clientId?: string, projectId?: string): Promise<Meeting[]> {
    const params: Record<string, string> = {};
    if (clientId) params['client_id'] = clientId;
    if (projectId) params['project_id'] = projectId;
    
    const response = await apiClient.get(`${API_PATH}/`, { params });
    return response.data;
  },

  // Fetch a single meeting by ID
  async getMeeting(id: string): Promise<Meeting> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new meeting
  async createMeeting(meeting: MeetingCreate): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/`, meeting);
    return response.data;
  },

  // Update an existing meeting
  async updateMeeting(id: string, meeting: MeetingUpdate): Promise<Meeting> {
    const response = await apiClient.put(`${API_PATH}/${id}`, meeting);
    return response.data;
  },

  // Delete a meeting
  async deleteMeeting(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  },
  
  // Add transcript to a meeting
  async addTranscript(id: string, transcript: string): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/${id}/transcript`, { transcript });
    return response.data;
  },
  
  // Add key points to a meeting
  async addKeyPoints(id: string, keyPoints: any[]): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/${id}/key_points`, { key_points: keyPoints });
    return response.data;
  },
  
  // Add recording URL to a meeting
  async addRecording(id: string, recordingUrl: string): Promise<Meeting> {
    const response = await apiClient.post(`${API_PATH}/${id}/recording`, { recording_url: recordingUrl });
    return response.data;
  }
};
```

# frontend\lib\api\organisationApi.ts

```ts
// frontend/lib/api/organisationApi.ts
import { Organisation } from '../../types/client';
import { apiClient } from './apiClient';

const API_PATH = '/api/v1/organisations';

export const organisationApi = {
  // Fetch all organisations
  async getOrganisations(): Promise<Organisation[]> {
    const response = await apiClient.get(`${API_PATH}/`);
    return response.data;
  },

  // Fetch a single organisation by ID
  async getOrganisation(id: string): Promise<Organisation> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  }
};
```

# frontend\lib\api\projectApi.ts

```ts
// frontend/lib/api/projectApi.ts
import axios from 'axios';
import { Project, ProjectCreate, ProjectUpdate } from '../../types/project';

const API_PATH = '/api/v1/projects';

// Configure axios instance with default headers
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const projectApi = {
  // Fetch all projects
  async getProjects(clientId?: string): Promise<Project[]> {
    const params = clientId ? { client_id: clientId } : {};
    const response = await apiClient.get(`${API_PATH}/`, { params });
    return response.data;
  },

  // Fetch a single project by ID
  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get(`${API_PATH}/${id}`);
    return response.data;
  },

  // Create a new project
  async createProject(project: ProjectCreate): Promise<Project> {
    const response = await apiClient.post(`${API_PATH}/`, project);
    return response.data;
  },

  // Update an existing project
  async updateProject(id: string, project: ProjectUpdate): Promise<Project> {
    const response = await apiClient.put(`${API_PATH}/${id}`, project);
    return response.data;
  },

  // Delete a project
  async deleteProject(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`${API_PATH}/${id}`);
    return response.data;
  }
};
```

# frontend\lib\utils\dateUtils.ts

```ts
// frontend/lib/utils/dateUtils.ts
import { format, parseISO } from 'date-fns';

/**
 * Format a date string to a human-readable format
 * @param dateString ISO date string
 * @param formatString Optional format string (default: 'PPP')
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, formatString: string = 'PPP'): string => {
  try {
    const date = parseISO(dateString);
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format a date string to a short date format (e.g., "Mar 15, 2023")
 * @param dateString ISO date string
 * @returns Formatted short date
 */
export const formatShortDate = (dateString: string): string => {
  return formatDate(dateString, 'MMM d, yyyy');
};

/**
 * Format a date string to a date and time format (e.g., "Mar 15, 2023 2:30 PM")
 * @param dateString ISO date string
 * @returns Formatted date and time
 */
export const formatDateTime = (dateString: string): string => {
  return formatDate(dateString, 'MMM d, yyyy h:mm a');
};

/**
 * Format a date string to a relative format (e.g., "2 days ago")
 * @param dateString ISO date string
 * @returns Formatted relative date
 */
export const formatRelativeDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    } else {
      const diffYears = Math.floor(diffDays / 365);
      return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return dateString;
  }
};
```

# frontend\lib\utils\debugUtils.ts

```ts
// frontend/lib/utils/debugUtils.ts

/**
 * Debug logger that only logs in development environment
 */
export const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

/**
 * Debug error logger that only logs in development environment
 */
export const debugError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};

/**
 * Debug API request to help troubleshoot API issues
 */
export const debugApiRequest = (method: string, url: string, data?: any) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group(`API Request: ${method} ${url}`);
  console.log('Time:', new Date().toISOString());
  if (data) {
    console.log('Request data:', data);
  }
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
  console.groupEnd();
};

/**
 * Debug API response to help troubleshoot API issues
 */
export const debugApiResponse = (
  method: string, 
  url: string, 
  status: number, 
  data?: any, 
  error?: any
) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group(`API Response: ${method} ${url}`);
  console.log('Status:', status);
  console.log('Time:', new Date().toISOString());
  if (data) {
    console.log('Response data:', data);
  }
  if (error) {
    console.error('Error:', error);
  }
  console.groupEnd();
};

/**
 * Check if the backend API is available
 * @returns Promise<boolean> - true if the API is available
 */
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/health`, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    return response.status === 200;
  } catch (error) {
    debugError('API availability check failed:', error);
    return false;
  }
};
```

# frontend\lib\utils\errorUtils.ts

```ts
// frontend/lib/utils/errorUtils.ts

/**
 * Extract error message from various error types
 * @param error Error object from catch block
 * @returns Formatted error message string
 */
export const getErrorMessage = (error: any): string => {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Handle Axios errors
  if (error.response) {
    // Server responded with a status code that falls out of the range of 2xx
    if (error.response.data && error.response.data.detail) {
      return error.response.data.detail;
    }
    if (error.response.data && typeof error.response.data === 'string') {
      return error.response.data;
    }
    return `Server error: ${error.response.status}`;
  } 
  
  if (error.request) {
    // The request was made but no response was received
    return 'No response from server. Please check your connection.';
  }
  
  // Handle standard Error objects
  if (error.message) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default error message
  return 'An error occurred. Please try again.';
};

/**
 * Check if an API error is a validation error
 * @param error Error object from catch block
 * @returns Boolean indicating if error is validation error
 */
export const isValidationError = (error: any): boolean => {
  return error?.response?.status === 422 || 
         (error?.response?.data && 'validation_error' in error.response.data);
};

/**
 * Extract validation errors from API response
 * @param error Error object from catch block
 * @returns Object with field names as keys and error messages as values
 */
export const getValidationErrors = (error: any): Record<string, string> => {
  if (!isValidationError(error)) {
    return {};
  }
  
  const validationErrors: Record<string, string> = {};
  
  if (error.response.data && error.response.data.detail) {
    const errors = Array.isArray(error.response.data.detail) 
      ? error.response.data.detail 
      : [error.response.data.detail];
    
    for (const err of errors) {
      if (err.loc && err.loc.length > 1) {
        // Typically loc is ['body', 'fieldname']
        const fieldName = err.loc[1];
        validationErrors[fieldName] = err.msg;
      }
    }
  }
  
  return validationErrors;
};
```

# frontend\next-env.d.ts

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/pages/building-your-application/configuring/typescript for more information.

```

# frontend\package.json

```json
{
  "name": "rogue-drones-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 19876",
    "build": "next build",
    "start": "next start -p 19876",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.2",
    "axios": "^1.6.2",
    "date-fns": "^2.30.0",
    "next": "^14.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "react-query": "^3.39.3",
    "tailwindcss": "^3.3.5",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.9.1",
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.54.0",
    "eslint-config-next": "^14.0.3",
    "postcss": "^8.4.31",
    "typescript": "^5.2.2"
  }
}
```

# frontend\pages\_app.tsx

```tsx
// frontend/pages/_app.tsx
import { AppProps } from 'next/app';
import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
```

# frontend\pages\clients\[id].tsx

```tsx
// frontend/pages/clients/[id].tsx
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ClientDetail from '../../components/clients/ClientDetail';
import ApiHealthCheck from '../../components/ApiHealthCheck';

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <Layout title="Client Details | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <ApiHealthCheck />
        
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Client Details</h1>
          <div className="space-x-4">
            {typeof id === 'string' && (
              <Link
                href={`/clients/${id}/edit`}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Edit Client
              </Link>
            )}
            <Link
              href="/clients"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back to Clients
            </Link>
          </div>
        </div>

        {typeof id === 'string' ? (
          <ClientDetail clientId={id} />
        ) : (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
            <p className="font-bold">Loading...</p>
            <p>Waiting for client ID parameter.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

# frontend\pages\clients\[id]\edit.tsx

```tsx
// frontend/pages/clients/[id]/edit.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import ClientForm from '../../../components/clients/ClientForm';
import { clientApi } from '../../../lib/api/clientApi';
import { Client } from '../../../types/client';
import { useApiStatus, withApiStatus } from '../../../hooks/useApiStatus';
import Link from 'next/link';

export default function EditClientPage() {
  const router = useRouter();
  const { id } = router.query;
  const [client, setClient] = useState<Client | null>(null);
  const { status, isLoading, isError, error, setStatus, setError } = useApiStatus();

  useEffect(() => {
    const fetchClient = async () => {
      if (typeof id !== 'string') return;

      const result = await withApiStatus(
        () => clientApi.getClient(id),
        { setStatus, setError }
      );

      if (result) {
        setClient(result);
      }
    };

    if (id) {
      fetchClient();
    }
  }, [id]);

  return (
    <Layout title="Edit Client | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {client ? `Edit ${client.name}` : 'Edit Client'}
          </h1>
          <p className="text-gray-600 mt-1">
            Update client information
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading client...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error?.message || 'Failed to load client details'}</p>
            <div className="mt-2">
              <Link href="/clients" className="text-red-700 underline">
                Return to clients list
              </Link>
            </div>
          </div>
        )}

        {/* Client form */}
        {client && !isLoading && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <ClientForm client={client} isEditing={true} />
          </div>
        )}

        <div className="mt-6">
          <Link 
            href={client ? `/clients/${client._id}` : '/clients'} 
            className="text-blue-600 hover:underline"
          >
            &larr; Back to {client ? client.name : 'Clients'}
          </Link>
        </div>
      </div>
    </Layout>
  );
}
```

# frontend\pages\clients\index.tsx

```tsx
// frontend/pages/clients/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { clientApi } from '../../lib/api/clientApi';
import { Client } from '../../types/client';
import { useApiStatus, withApiStatus } from '../../hooks/useApiStatus';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const { status, isLoading, isError, error, setStatus, setError } = useApiStatus();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      const fetchedClients = await withApiStatus(
        () => clientApi.getClients(),
        { setStatus, setError }
      );

      if (fetchedClients) {
        setClients(fetchedClients);
      }
    };

    fetchClients();
  }, []);

  // Handle client deletion
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setDeleteId(id);
      const result = await withApiStatus(
        () => clientApi.deleteClient(id),
        { setStatus, setError }
      );

      if (result) {
        // Remove deleted client from state
        setClients(clients.filter(client => client._id !== id));
        setDeleteId(null);
      }
    }
  };

  return (
    <Layout title="Clients | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Link
            href="/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add New Client
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && !deleteId && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading clients...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error?.message || 'Failed to load clients'}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No clients found</p>
            <p className="mt-2">
              <Link 
                href="/clients/new" 
                className="text-blue-600 hover:underline"
              >
                Add your first client
              </Link>
            </p>
          </div>
        )}

        {/* Client list */}
        {clients.length > 0 && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/clients/${client._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a href={`mailto:${client.email}`} className="text-gray-600 hover:text-gray-900">
                        {client.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {client.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {client.organisation_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/clients/${client._id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(client._id)}
                        className={`text-red-600 hover:text-red-900 ${
                          deleteId === client._id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={deleteId === client._id}
                      >
                        {deleteId === client._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

# frontend\pages\clients\new.tsx

```tsx
// frontend/pages/clients/new.tsx
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ClientForm from '../../components/clients/ClientForm';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();

  return (
    <Layout title="New Client | Rogue Drones">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create New Client</h1>
          <p className="text-gray-600 mt-1">
            Add a new client to the system
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <ClientForm />
        </div>

        <div className="mt-6">
          <Link href="/clients" className="text-blue-600 hover:underline">
            &larr; Back to Clients
          </Link>
        </div>
      </div>
    </Layout>
  );
}
```

# frontend\pages\index.tsx

```tsx
// frontend/pages/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // Render the dashboard only if authenticated
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Rogue Drones Client Workflow</h1>
        
        {user && (
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6">
            <p className="font-semibold">Welcome, {user.first_name} {user.last_name}!</p>
            <p>You are logged in to the Rogue Drones client management system.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Clients</h2>
            <p className="text-gray-600 mb-4">Manage client information and relationships</p>
            <button
              onClick={() => router.push('/clients')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Clients
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Projects</h2>
            <p className="text-gray-600 mb-4">Track active and completed projects</p>
            <button
              onClick={() => router.push('/projects')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Projects
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Meetings</h2>
            <p className="text-gray-600 mb-4">Schedule and manage client meetings</p>
            <button
              onClick={() => router.push('/meetings')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Meetings
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Documents</h2>
            <p className="text-gray-600 mb-4">Create and manage client documents</p>
            <button
              onClick={() => router.push('/documents')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Documents
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Organizations</h2>
            <p className="text-gray-600 mb-4">Manage client organizations</p>
            <button
              onClick={() => router.push('/organisations')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Organizations
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

# frontend\pages\login.tsx

```tsx
// frontend/pages/login.tsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

type LoginFormData = {
  email: string;
  password: string;
};

export default function Login() {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'running' | 'error'>('checking');
  const { login, error: authError, loading } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  
  // Get API URL on component mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091';
    setApiUrl(url);
    console.log('API URL:', url);
  }, []);

  // Check if backend is running
  useEffect(() => {
    const checkBackend = async () => {
      if (!apiUrl) return;
      
      try {
        // Try to access the health check endpoint
        await fetch(`${apiUrl}/health`, { method: 'GET' });
        console.log('Backend is running');
        setBackendStatus('running');
      } catch (err) {
        console.error('Backend connection error:', err);
        setBackendStatus('error');
      }
    };
    
    checkBackend();
  }, [apiUrl]);
  
  const onSubmit = async (data: LoginFormData) => {
    await login(data.email, data.password);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Rogue Drones Client Workflow
        </h1>
        
        <h2 className="text-xl font-semibold mb-6">Login</h2>
        
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {authError}
          </div>
        )}

        {backendStatus === 'error' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Cannot connect to the backend server. Please ensure it is running at {apiUrl}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.email ? 'border-red-500' : ''
              }`}
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.email.message}
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.password ? 'border-red-500' : ''
              }`}
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
            />
            {errors.password && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                'Login'
              )}
            </button>
            
            <Link
              href="/register"
              className="inline-block align-baseline font-bold text-sm text-blue-600 hover:text-blue-800"
            >
              Register
            </Link>
          </div>
        </form>
        
        {/* API connection info */}
        <div className="mt-8 text-xs text-gray-500">
          <p>Connecting to API: {apiUrl}</p>
          <p className="mt-1">
            {backendStatus === 'checking' && 'Checking connection to backend...'}
            {backendStatus === 'running' && 'Backend server is running.'}
            {backendStatus === 'error' && 'Cannot connect to backend server.'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

# frontend\pages\register.tsx

```tsx
// frontend/pages/register.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Link from 'next/link';

type RegisterFormData = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>('');

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>();

  useEffect(() => {
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9091');
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.post(
        `${apiUrl}/api/v1/auth/register`,
        {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          password: data.password,
        }
      );
      router.push('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Rogue Drones Client Workflow
        </h1>
        <h2 className="text-xl font-semibold mb-6">Register</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={`shadow border rounded w-full py-2 px-3 ${
                errors.email ? 'border-red-500' : ''
              }`}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email'
                }
              })}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="firstName">
              First Name
            </label>
            <input
              id="firstName"
              className={`shadow border rounded w-full py-2 px-3 ${
                errors.firstName ? 'border-red-500' : ''
              }`}
              {...register('firstName', { required: 'First name is required' })}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="lastName">
              Last Name
            </label>
            <input
              id="lastName"
              className={`shadow border rounded w-full py-2 px-3 ${
                errors.lastName ? 'border-red-500' : ''
              }`}
              {...register('lastName', { required: 'Last name is required' })}
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`shadow border rounded w-full py-2 px-3 ${
                errors.password ? 'border-red-500' : ''
              }`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Min 6 characters' }
              })}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Registering…' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>

        <div className="mt-6 text-xs text-gray-500">
          <p>Connecting to API: {apiUrl}</p>
        </div>
      </div>
    </div>
  );
}

```

# frontend\postcss.config.js

```js
// frontend/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

# frontend\styles\globals.css

```css
/* frontend/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

* {
  box-sizing: border-box;
}
```

# frontend\tailwind.config.js

```js

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

# frontend\tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

# frontend\types\client.ts

```ts
// frontend/types/client.ts

// Base client properties
export interface ClientBase {
  name: string;
  email: string;
  phone?: string;
  organisation_id?: string;
  notes?: string;
  initial_query?: string;
}

// Interface for client creation
export interface ClientCreate extends ClientBase {}

// Interface for client updates (all fields optional)
export interface ClientUpdate {
  name?: string;
  email?: string;
  phone?: string;
  organisation_id?: string;
  notes?: string;
  initial_query?: string;
}

// Full client model including server-generated fields
export interface Client extends ClientBase {
  _id: string;
  created_at: string;
  updated_at: string;
}

// Organisation reference for displaying organisation details with client
export interface Organisation {
  _id: string;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
}
```

# frontend\types\document.ts

```ts
// frontend/types/document.ts

// Document version properties
export interface DocumentVersionBase {
  version_number: number;
  content: string;
  created_by: string;
  notes?: string;
}

// Interface for document version creation
export interface DocumentVersionCreate extends DocumentVersionBase {}

// Full document version model
export interface DocumentVersion extends DocumentVersionBase {
  created_at: string;
}

// Base document properties
export interface DocumentBase {
  title: string;
  document_type: string;
  client_id: string;
  project_id?: string;
  status: string;
  requires_signature: boolean;
}

// Interface for document creation
export interface DocumentCreate extends DocumentBase {
  content: string; // Initial content for version 1
}

// Interface for document updates
export interface DocumentUpdate {
  title?: string;
  document_type?: string;
  client_id?: string;
  project_id?: string;
  status?: string;
  requires_signature?: boolean;
  new_version_content?: string;
  new_version_notes?: string;
}

// Full document model including server-generated fields
export interface Document extends DocumentBase {
  _id: string;
  current_version: number;
  versions: DocumentVersion[];
  signed: boolean;
  signed_at?: string;
  signed_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

# frontend\types\index.ts

```ts
// frontend/types/index.ts

// Re-export all types from individual files
export * from './client';
export * from './project';
export * from './meeting';
export * from './document';
```

# frontend\types\meeting.ts

```ts
// frontend/types/meeting.ts

// Meeting attendee properties
export interface MeetingAttendeeBase {
  name: string;
  email?: string;
  organisation?: string;
  role?: string;
}

// Interface for meeting attendee creation
export interface MeetingAttendeeCreate extends MeetingAttendeeBase {}

// Full meeting attendee model
export interface MeetingAttendee extends MeetingAttendeeBase {}

// Key point properties
export interface KeyPointBase {
  content: string;
  category?: string;
}

// Interface for key point creation
export interface KeyPointCreate extends KeyPointBase {}

// Full key point model
export interface KeyPoint extends KeyPointBase {}

// Base meeting properties
export interface MeetingBase {
  title: string;
  description?: string;
  client_id: string;
  project_id?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  virtual: boolean;
  meeting_url?: string;
  notes?: string;
}

// Interface for meeting creation
export interface MeetingCreate extends MeetingBase {
  attendees?: MeetingAttendeeCreate[];
}

// Interface for meeting updates
export interface MeetingUpdate {
  title?: string;
  description?: string;
  client_id?: string;
  project_id?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  virtual?: boolean;
  meeting_url?: string;
  attendees?: MeetingAttendeeCreate[];
  recording_url?: string;
  transcript?: string;
  key_points?: KeyPointCreate[];
  notes?: string;
}

// Full meeting model including server-generated fields
export interface Meeting extends MeetingBase {
  _id: string;
  attendees: MeetingAttendee[];
  recording_url?: string;
  transcript?: string;
  key_points: KeyPoint[];
  created_at: string;
  updated_at: string;
}
```

# frontend\types\project.ts

```ts
// frontend/types/project.ts

// Base milestone properties
export interface MilestoneBase {
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
}

// Interface for milestone creation
export interface MilestoneCreate extends MilestoneBase {}

// Interface for milestone updates
export interface MilestoneUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  completed?: boolean;
  completed_at?: string;
}

// Full milestone model
export interface Milestone extends MilestoneBase {}

// Base project properties
export interface ProjectBase {
  title: string;
  description?: string;
  client_id: string;
  organisation_id?: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  assessment_score?: number;
  notes?: string;
}

// Interface for project creation
export interface ProjectCreate extends ProjectBase {
  milestones?: MilestoneCreate[];
}

// Interface for project updates
export interface ProjectUpdate {
  title?: string;
  description?: string;
  client_id?: string;
  organisation_id?: string;
  status?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  assessment_score?: number;
  notes?: string;
  milestones?: MilestoneCreate[];
}

// Full project model including server-generated fields
export interface Project extends ProjectBase {
  _id: string;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

// frontend/types/meeting.ts

// Meeting attendee properties
export interface MeetingAttendeeBase {
  name: string;
  email?: string;
  organisation?: string;
  role?: string;
}

// Interface for meeting attendee creation
export interface MeetingAttendeeCreate extends MeetingAttendeeBase {}

// Full meeting attendee model
export interface MeetingAttendee extends MeetingAttendeeBase {}

// Key point properties
export interface KeyPointBase {
  content: string;
  category?: string;
}

// Interface for key point creation
export interface KeyPointCreate extends KeyPointBase {}

// Full key point model
export interface KeyPoint extends KeyPointBase {}

// Base meeting properties
export interface MeetingBase {
  title: string;
  description?: string;
  client_id: string;
  project_id?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  virtual: boolean;
  meeting_url?: string;
  notes?: string;
}

// Interface for meeting creation
export interface MeetingCreate extends MeetingBase {
  attendees?: MeetingAttendeeCreate[];
}

// Interface for meeting updates
export interface MeetingUpdate {
  title?: string;
  description?: string;
  client_id?: string;
  project_id?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  virtual?: boolean;
  meeting_url?: string;
  attendees?: MeetingAttendeeCreate[];
  recording_url?: string;
  transcript?: string;
  key_points?: KeyPointCreate[];
  notes?: string;
}

// Full meeting model including server-generated fields
export interface Meeting extends MeetingBase {
  _id: string;
  attendees: MeetingAttendee[];
  recording_url?: string;
  transcript?: string;
  key_points: KeyPoint[];
  created_at: string;
  updated_at: string;
}

// frontend/types/document.ts

// Document version properties
export interface DocumentVersionBase {
  version_number: number;
  content: string;
  created_by: string;
  notes?: string;
}

// Interface for document version creation
export interface DocumentVersionCreate extends DocumentVersionBase {}

// Full document version model
export interface DocumentVersion extends DocumentVersionBase {
  created_at: string;
}

// Base document properties
export interface DocumentBase {
  title: string;
  document_type: string;
  client_id: string;
  project_id?: string;
  status: string;
  requires_signature: boolean;
}

// Interface for document creation
export interface DocumentCreate extends DocumentBase {
  content: string; // Initial content for version 1
}

// Interface for document updates
export interface DocumentUpdate {
  title?: string;
  document_type?: string;
  client_id?: string;
  project_id?: string;
  status?: string;
  requires_signature?: boolean;
  new_version_content?: string;
  new_version_notes?: string;
}

// Full document model including server-generated fields
export interface Document extends DocumentBase {
  _id: string;
  current_version: number;
  versions: DocumentVersion[];
  signed: boolean;
  signed_at?: string;
  signed_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// frontend/types/index.ts

// Re-export all interfaces from a single file for easier imports
export * from './client';
export * from './project';
export * from './meeting';
export * from './document';
```

