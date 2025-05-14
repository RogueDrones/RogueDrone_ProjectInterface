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