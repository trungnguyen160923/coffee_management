"""
Anomaly Entity - Domain model for anomaly detection results
"""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional
from enum import Enum


class AnomalySeverity(str, Enum):
    """Mức độ nghiêm trọng của anomaly"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AnomalyStatus(str, Enum):
    """Trạng thái xử lý anomaly"""
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    IGNORED = "IGNORED"


@dataclass
class AnomalyResult:
    """Entity đại diện cho kết quả phát hiện bất thường"""
    
    id: Optional[int] = None
    metric_id: Optional[int] = None
    branch_id: int = 0
    analysis_date: date = None
    model_id: Optional[int] = None
    
    # Prediction results
    is_anomaly: bool = False
    anomaly_score: Optional[float] = None
    confidence_level: Optional[float] = None
    
    # Business logic
    severity: Optional[AnomalySeverity] = None
    status: AnomalyStatus = AnomalyStatus.DETECTED
    
    # Context information (stored as JSON strings)
    affected_features: Optional[str] = None
    baseline_values: Optional[str] = None
    actual_values: Optional[str] = None
    
    # Resolution tracking
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    
    analysis_timestamp: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Convert entity to dictionary"""
        return {
            'id': self.id,
            'metric_id': self.metric_id,
            'branch_id': self.branch_id,
            'analysis_date': self.analysis_date,
            'model_id': self.model_id,
            'is_anomaly': self.is_anomaly,
            'anomaly_score': self.anomaly_score,
            'confidence_level': self.confidence_level,
            'severity': self.severity.value if self.severity else None,
            'status': self.status.value,
            'affected_features': self.affected_features,
            'baseline_values': self.baseline_values,
            'actual_values': self.actual_values,
            'resolved_at': self.resolved_at,
            'resolved_by': self.resolved_by,
            'resolution_notes': self.resolution_notes,
            'analysis_timestamp': self.analysis_timestamp
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'AnomalyResult':
        """Create entity from dictionary"""
        # Convert string enums to enum objects
        if 'severity' in data and data['severity']:
            data['severity'] = AnomalySeverity(data['severity'])
        if 'status' in data and data['status']:
            data['status'] = AnomalyStatus(data['status'])
        return cls(**data)

