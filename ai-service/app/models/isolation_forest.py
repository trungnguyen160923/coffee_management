"""
Isolation Forest Anomaly Detector wrapper
Sử dụng TOOL2 ML components
"""
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Wrapper class cho Isolation Forest detector
    Sử dụng TOOL2 ML components
    """
    
    def __init__(self, contamination: float = 0.1):
        """
        Initialize detector
        
        Args:
            contamination: Expected proportion of anomalies (0.0 to 0.5)
        """
        self.contamination = contamination
        self.model = None
        self.scaler = None
        self.feature_list = None
        
    def train(self, metrics_list: List[Dict[str, Any]], feature_list: List[str]) -> bool:
        """
        Train Isolation Forest model
        
        Args:
            metrics_list: List of metric dictionaries
            feature_list: List of feature names to use
        
        Returns:
            True if training successful, False otherwise
        """
        try:
            from app.TOOL2.src.infrastructure.ml.ml_trainer import MLTrainer
            from app.TOOL2.src.domain.entities.metrics import DailyBranchMetrics
            
            # Convert dict to DailyBranchMetrics entities
            metrics_entities = []
            for metric_dict in metrics_list:
                try:
                    # Create entity from dict
                    metric = DailyBranchMetrics.from_dict(metric_dict)
                    metrics_entities.append(metric)
                except Exception as e:
                    logger.warning(f"Failed to convert metric dict to entity: {e}")
                    continue
            
            if len(metrics_entities) < 10:
                logger.warning(f"Insufficient data: {len(metrics_entities)} samples (minimum: 10)")
                return False
            
            # Train model
            trainer = MLTrainer()
            model, scaler, metadata = trainer.train(
                metrics_entities,
                n_estimators=100,
                contamination=self.contamination
            )
            
            self.model = model
            self.scaler = scaler
            self.feature_list = feature_list
            
            logger.info(f"Model trained successfully with {len(metrics_entities)} samples")
            return True
            
        except ImportError as e:
            logger.error(f"Error importing TOOL2 modules: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Error training model: {e}", exc_info=True)
            return False
    
    def predict(self, metrics_dict: Dict[str, Any]) -> Tuple[bool, float, Dict[str, float]]:
        """
        Predict anomaly for given metrics
        
        Args:
            metrics_dict: Dictionary of metric values
        
        Returns:
            Tuple of (is_anomaly, anomaly_score, feature_values)
        """
        if self.model is None or self.scaler is None:
            raise ValueError("Model not trained. Call train() first.")
        
        try:
            from app.TOOL2.src.infrastructure.ml.ml_predictor import MLPredictor
            from app.TOOL2.src.domain.entities.metrics import DailyBranchMetrics
            
            # Convert dict to entity
            metric = DailyBranchMetrics.from_dict(metrics_dict)
            
            # Predict
            predictor = MLPredictor()
            is_anomaly, anomaly_score, confidence = predictor.predict(
                self.model, self.scaler, metric, score_stats=None
            )
            
            # Extract feature values (normalized)
            feature_values = {}
            if self.feature_list:
                metric_dict = metric.to_dict()
                for feature in self.feature_list:
                    feature_values[feature] = metric_dict.get(feature, 0.0) or 0.0
            
            return is_anomaly, anomaly_score, feature_values
            
        except Exception as e:
            logger.error(f"Error predicting: {e}", exc_info=True)
            raise

