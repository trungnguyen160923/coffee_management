"""
SQLAlchemy model for Report
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime
from typing import Optional, Dict, Any, List


class Report(Base):
    """Report model for database"""
    __tablename__ = "ai_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, nullable=False, index=True)
    report_date = Column(DateTime, nullable=False, index=True)
    tool_type = Column(String(50), nullable=True)
    
    # Report content
    analysis = Column(Text, nullable=False)
    summary = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    raw_data = Column(JSON, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Status flags
    is_sent = Column(Boolean, nullable=False, default=False, index=True)
    sent_at = Column(DateTime, nullable=True)
    
    # Additional metadata
    query = Column(Text, nullable=True)
    ai_model = Column(String(100), nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    
    def __repr__(self):
        return f"<Report(id={self.id}, branch_id={self.branch_id}, report_date={self.report_date})>"

