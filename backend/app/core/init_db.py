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