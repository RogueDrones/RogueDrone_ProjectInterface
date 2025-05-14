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