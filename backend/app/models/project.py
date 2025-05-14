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