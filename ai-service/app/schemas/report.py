"""
Pydantic schemas for Report API
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List


class ReportCreate(BaseModel):
    """Schema for creating a new report"""
    branch_id: Optional[int] = None  # None or 0 for admin/all branches reports
    report_date: datetime
    tool_type: Optional[str] = None
    analysis: str
    summary: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    raw_data: Optional[Dict[str, Any]] = None
    query: Optional[str] = None
    ai_model: Optional[str] = None
    processing_time_ms: Optional[int] = None


class ReportResponse(BaseModel):
    """Schema for report response"""
    id: int
    branch_id: int
    report_date: datetime
    tool_type: Optional[str]
    analysis: str
    summary: Optional[Dict[str, Any]]
    recommendations: Optional[List[str]]
    raw_data: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    is_sent: bool
    sent_at: Optional[datetime]
    query: Optional[str]
    ai_model: Optional[str]
    processing_time_ms: Optional[int]
    
    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Schema for list of reports"""
    reports: List[ReportResponse]
    total: int
    page: int
    page_size: int


class ReportUpdate(BaseModel):
    """Schema for updating report (e.g., marking as sent)"""
    is_sent: Optional[bool] = None
    sent_at: Optional[datetime] = None

