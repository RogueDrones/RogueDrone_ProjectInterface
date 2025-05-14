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