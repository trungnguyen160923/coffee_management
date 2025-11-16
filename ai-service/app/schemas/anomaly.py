"""
Pydantic schemas for anomaly detection
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import date
from enum import Enum


class Severity(str, Enum):
    """Anomaly severity levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AnomalyStatus(str, Enum):
    """Anomaly status"""
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    IGNORED = "IGNORED"


class AnomalyResult(BaseModel):
    """Anomaly detection result"""
    branch_id: int
    analysis_date: date
    is_anomaly: bool
    anomaly_score: float = Field(..., ge=0, le=1, description="Anomaly score (0-1, higher is more anomalous)")
    confidence_level: Optional[float] = Field(None, ge=0, le=1)
    severity: Optional[Severity] = None
    status: AnomalyStatus = AnomalyStatus.DETECTED
    affected_features: Optional[Dict[str, Any]] = None
    baseline_values: Optional[Dict[str, Any]] = None
    actual_values: Optional[Dict[str, Any]] = None


class AnomalyDetectionRequest(BaseModel):
    """Request for anomaly detection"""
    branch_id: int
    date: date


class AnomalyDetectionResponse(BaseModel):
    """Response from anomaly detection"""
    success: bool
    result: Optional[AnomalyResult] = None
    message: Optional[str] = None


class ModelTrainingRequest(BaseModel):
    """Request for model training"""
    branch_id: int
    start_date: date
    end_date: date
    model_name: Optional[str] = None


class ModelTrainingResponse(BaseModel):
    """Response from model training"""
    success: bool
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    training_samples: Optional[int] = None
    message: Optional[str] = None

