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
    ai_quality_score: Optional[float] = Field(
        None,
        description="AI response quality score (0.0-1.0)"
    )
    overall_confidence: Optional[Dict[str, Any]] = Field(
        None,
        description="Overall confidence score with breakdown"
    )
    message: Optional[str] = Field(None, description="Additional message or error")


class AllBranchesAIAgentRequest(BaseModel):
    """Request for AI Agent analysis of all branches (for Admin)"""
    date: date_type = Field(..., description="Date to analyze")
    query: Optional[str] = Field(
        None, 
        description="Optional specific query/question for the AI agent"
    )


class AllBranchesAIAgentResponse(BaseModel):
    """Response from AI Agent analysis of all branches (for Admin)"""
    success: bool = Field(..., description="Whether the analysis was successful")
    date: date_type = Field(..., description="Date analyzed")
    analysis: str = Field(..., description="AI-generated analysis text for all branches")
    summary: Optional[Dict[str, Any]] = Field(
        None, 
        description="Structured summary of key metrics across all branches"
    )
    recommendations: Optional[list[str]] = Field(
        None,
        description="List of recommendations from AI for all branches"
    )
    raw_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Raw JSON data collected from services for all branches"
    )
    ai_quality_score: Optional[float] = Field(
        None,
        description="AI response quality score (0.0-1.0)"
    )
    overall_confidence: Optional[Dict[str, Any]] = Field(
        None,
        description="Overall confidence score with breakdown"
    )
    message: Optional[str] = Field(None, description="Additional message or error")
