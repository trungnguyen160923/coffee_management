"""
Service for anomaly detection operations
"""
from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from app.models.isolation_forest import AnomalyDetector
from app.services.data_collector import DataCollectorService
from app.schemas.anomaly import AnomalyResult, Severity, AnomalyStatus
from app.schemas.metrics import DailyBranchMetrics
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class AnomalyService:
    """Service for anomaly detection"""
    
    def __init__(self):
        self.data_collector = DataCollectorService()
        self.detectors: Dict[int, AnomalyDetector] = {}  # branch_id -> detector
    
    def _calculate_severity(self, anomaly_score: float) -> Severity:
        """Calculate severity based on anomaly score"""
        if anomaly_score >= 0.8:
            return Severity.CRITICAL
        elif anomaly_score >= 0.6:
            return Severity.HIGH
        elif anomaly_score >= 0.4:
            return Severity.MEDIUM
        else:
            return Severity.LOW
    
    def _get_baseline_values(self, metrics_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate baseline (mean) values from history"""
        if not metrics_history:
            return {}
        
        baseline = {}
        feature_list = settings.FEATURE_LIST
        
        for feature in feature_list:
            values = [m.get(feature, 0.0) or 0.0 for m in metrics_history]
            baseline[feature] = sum(values) / len(values) if values else 0.0
        
        return baseline
    
    async def train_model(
        self, 
        branch_id: int, 
        start_date: date, 
        end_date: date
    ) -> bool:
        """Train model for a specific branch using historical data"""
        try:
            # Collect historical metrics
            metrics_list = []
            current_date = start_date
            
            while current_date <= end_date:
                metrics = await self.data_collector.collect_daily_metrics(branch_id, current_date)
                if metrics:
                    metrics_dict = metrics.model_dump()
                    metrics_list.append(metrics_dict)
                current_date += timedelta(days=1)
            
            if len(metrics_list) < settings.MIN_TRAINING_SAMPLES:
                logger.warning(
                    f"Insufficient data for training: {len(metrics_list)} samples "
                    f"(minimum: {settings.MIN_TRAINING_SAMPLES})"
                )
                return False
            
            # Create and train detector
            detector = AnomalyDetector(contamination=settings.ANOMALY_THRESHOLD)
            success = detector.train(metrics_list, settings.FEATURE_LIST)
            
            if success:
                self.detectors[branch_id] = detector
                logger.info(f"Model trained successfully for branch {branch_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error training model for branch {branch_id}: {e}", exc_info=True)
            return False
    
    async def detect_anomaly(
        self, 
        branch_id: int, 
        target_date: date
    ) -> Optional[AnomalyResult]:
        """Detect anomaly for a specific branch on a specific date"""
        try:
            # Check if model exists for this branch
            if branch_id not in self.detectors:
                logger.warning(f"No trained model for branch {branch_id}, training now...")
                # Try to train with recent data (last 30 days)
                end_date = target_date - timedelta(days=1)
                start_date = end_date - timedelta(days=30)
                success = await self.train_model(branch_id, start_date, end_date)
                if not success:
                    return None
            
            detector = self.detectors[branch_id]
            
            # Collect current metrics
            metrics = await self.data_collector.collect_daily_metrics(branch_id, target_date)
            if not metrics:
                logger.error(f"Failed to collect metrics for branch {branch_id} on {target_date}")
                return None
            
            metrics_dict = metrics.model_dump()
            
            # Predict anomaly
            is_anomaly, anomaly_score, feature_values = detector.predict(metrics_dict)
            
            # Calculate severity
            severity = self._calculate_severity(anomaly_score) if is_anomaly else None
            
            # Get baseline (would need historical data, simplified here)
            baseline_values = {}  # TODO: Implement baseline calculation
            
            # Determine affected features (features with significant deviation)
            affected_features = {}
            if is_anomaly:
                # Simple heuristic: mark features that are significantly different
                for feature, value in feature_values.items():
                    if abs(value) > 2.0:  # Threshold can be adjusted
                        affected_features[feature] = value
            
            result = AnomalyResult(
                branch_id=branch_id,
                analysis_date=target_date,
                is_anomaly=is_anomaly,
                anomaly_score=anomaly_score,
                confidence_level=min(anomaly_score * 1.2, 1.0),  # Simple confidence calculation
                severity=severity,
                status=AnomalyStatus.DETECTED,
                affected_features=affected_features if affected_features else None,
                baseline_values=baseline_values if baseline_values else None,
                actual_values=feature_values
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting anomaly: {e}", exc_info=True)
            return None

