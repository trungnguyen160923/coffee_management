"""
Pydantic schemas for AI Agent requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import date as date_type


class AIAgentRequest(BaseModel):
    """Request for AI Agent analysis"""
    branch_id: int = Field(..., description="Branch ID to analyze")
    date: date_type = Field(..., description="Date to analyze")
    query: Optional[str] = Field(
        None, 
        description="Optional specific query/question for the AI agent"
    )
    tool_type: Optional[str] = Field(
        None,
        description="Type of tool: 'tool1' (statistics) or 'tool3' (other)"
    )


class AIAgentResponse(BaseModel):
    """Response from AI Agent analysis"""
    success: bool = Field(..., description="Whether the analysis was successful")
    branch_id: int = Field(..., description="Branch ID analyzed")
    date: date_type = Field(..., description="Date analyzed")
    analysis: str = Field(..., description="AI-generated analysis text")
    summary: Optional[Dict[str, Any]] = Field(
        None, 
        description="Structured summary of key metrics"
    )
    recommendations: Optional[list[str]] = Field(
        None,
        description="List of recommendations from AI"
    )
    raw_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Raw JSON data collected from services"
    )
    message: Optional[str] = Field(None, description="Additional message or error")

