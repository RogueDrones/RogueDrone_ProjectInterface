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