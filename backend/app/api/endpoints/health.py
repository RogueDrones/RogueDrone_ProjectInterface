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