"""
SQLAlchemy model for Report
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Float
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
    
    # Confidence scores (Phase 4)
    data_quality_score = Column(Float, nullable=True, comment='Data quality score (0.0-1.0)')
    ml_confidence_score = Column(Float, nullable=True, comment='ML confidence score (0.0-1.0)')
    ai_quality_score = Column(Float, nullable=True, comment='AI response quality score (0.0-1.0)')
    overall_confidence_score = Column(Float, nullable=True, comment='Overall confidence score (0.0-1.0)')
    confidence_breakdown = Column(JSON, nullable=True, comment='Detailed confidence breakdown as JSON')
    validation_flags = Column(JSON, nullable=True, comment='Validation warnings/flags as JSON')
    
    def __repr__(self):
        return f"<Report(id={self.id}, branch_id={self.branch_id}, report_date={self.report_date})>"

