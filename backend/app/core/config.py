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