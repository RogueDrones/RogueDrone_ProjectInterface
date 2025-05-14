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