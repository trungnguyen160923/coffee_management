"""
ML Predictor - Infrastructure service for making predictions
"""
import pickle
import warnings
import json
import numpy as np
import pandas as pd
from typing import Tuple, Any, Dict

from ...domain.entities.ml_model import MLModel
from ...domain.entities.metrics import DailyBranchMetrics
from ...domain.services.anomaly_detector import AnomalyDetector
from .ml_trainer import MLTrainer


class MLPredictor:
    """Service để predict anomalies"""
    
    def __init__(self):
        self.trainer = MLTrainer()
        self.detector = AnomalyDetector()
    
    def load_model(self, model_entity: MLModel) -> Tuple[Any, Any, Dict]:
        """
        Load model, scaler và score statistics từ entity
        
        Args:
            model_entity: MLModel entity
        
        Returns:
            model: IsolationForest model
            scaler: StandardScaler
            score_stats: Dict chứa score statistics (min, max, q25, q75, etc.)
        """
        model_package = pickle.loads(model_entity.model_data)
        score_stats = model_package.get('score_stats', {})
        
        # Hỗ trợ model cũ: Nếu không có contamination trong score_stats,
        # lấy từ hyperparameters để dùng contamination rate method
        if 'contamination' not in score_stats and 'threshold_score' not in score_stats:
            if hasattr(model_entity, 'hyperparameters') and model_entity.hyperparameters:
                try:
                    hyperparams = json.loads(model_entity.hyperparameters)
                    contamination = hyperparams.get('contamination', 0.1)
                    score_stats['contamination'] = contamination
                    score_stats['threshold_percentile'] = 100.0 * (1.0 - contamination)
                except (json.JSONDecodeError, KeyError, ValueError, TypeError):
                    # Giữ nguyên score_stats nếu không parse được
                    pass
        
        return model_package['model'], model_package['scaler'], score_stats
    
    def predict(self, model, scaler, metric: DailyBranchMetrics, 
                score_stats: Dict = None) -> Tuple[bool, float, float]:
        """
        Predict anomaly cho một metrics
        
        Args:
            model: IsolationForest model
            scaler: StandardScaler
            metric: DailyBranchMetrics entity
            score_stats: Dict chứa score statistics từ training (min, max, q25, q75, etc.)
        
        Returns:
            is_anomaly: True nếu là anomaly
            anomaly_score: Điểm số (0-1, càng cao càng bất thường)
            confidence_level: Độ tin cậy
        """
        # Chuẩn bị features - sử dụng DataFrame để tránh warning về feature names
        metric_dict = metric.to_dict()
        X_dict = {feat: [metric_dict.get(feat, 0)] for feat in self.trainer.FEATURES}
        X_df = pd.DataFrame(X_dict)
        
        # Handle missing values
        X_df = X_df.fillna(0)
        
        # Convert boolean to int nếu có
        if 'is_weekend' in X_df.columns:
            X_df['is_weekend'] = X_df['is_weekend'].astype(int)
        
        # Normalize - sử dụng DataFrame để tránh warning
        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', category=UserWarning, message='.*feature names.*')
            X_scaled = scaler.transform(X_df)
        
        # Predict
        prediction = model.predict(X_scaled)[0]  # -1 = anomaly, 1 = normal
        score = model.score_samples(X_scaled)[0]
        
        # Normalize score với score statistics từ training data
        if score_stats:
            anomaly_score = self.detector.normalize_anomaly_score_adaptive(
                score, score_stats
            )
        else:
            # Fallback về method cũ nếu không có score_stats
            anomaly_score = self.detector.normalize_anomaly_score(score)
        
        is_anomaly = (prediction == -1)
        
        # Tính confidence dựa trên khoảng cách đến threshold
        # Confidence cao khi:
        # - Anomaly score rất cao (gần 1.0) hoặc rất thấp (gần 0.0)
        # - Khoảng cách xa threshold (0.5)
        if score_stats:
            # Sử dụng contamination rate để tính threshold chính xác
            # (Thay vì IQR method - chính xác hơn)
            # Method 1: Dùng threshold_score trực tiếp (chính xác nhất - từ training)
            if 'threshold_score' in score_stats:
                threshold_estimate = score_stats['threshold_score']
            # Method 2: Tính từ contamination rate nếu không có threshold_score
            elif 'contamination' in score_stats:
                contamination = score_stats.get('contamination', 0.1)
                threshold_percentile = 100.0 * (1.0 - contamination)
                # Ước tính từ percentiles (interpolation)
                if threshold_percentile <= 25 and 'q25_score' in score_stats:
                    ratio = threshold_percentile / 25.0
                    threshold_estimate = score_stats['min_score'] + ratio * (
                        score_stats['q25_score'] - score_stats['min_score']
                    )
                elif threshold_percentile <= 75 and 'q25_score' in score_stats and 'q75_score' in score_stats:
                    ratio = (threshold_percentile - 25) / 50.0
                    threshold_estimate = score_stats['q25_score'] + ratio * (
                        score_stats['q75_score'] - score_stats['q25_score']
                    )
                elif 'q75_score' in score_stats:
                    ratio = (threshold_percentile - 75) / 25.0
                    threshold_estimate = score_stats['q75_score'] + ratio * (
                        score_stats['max_score'] - score_stats['q75_score']
                    )
                else:
                    threshold_estimate = score_stats.get('median_score', -0.3)
            # Method 3: Fallback về IQR nếu không có contamination rate
            elif 'q75_score' in score_stats and 'q25_score' in score_stats:
                # Ước tính threshold dựa trên IQR (cũ - cho backward compatibility)
                iqr = score_stats['q75_score'] - score_stats['q25_score']
                threshold_estimate = score_stats['q25_score'] - 1.5 * iqr
            else:
                threshold_estimate = score_stats.get('min_score', -0.5)
            
            # Confidence = khoảng cách từ score đến threshold
            # Score càng xa threshold → confidence càng cao
            distance_to_threshold = abs(score - threshold_estimate)
            
            # Tính max_distance từ CẢ 2 PHÍA của threshold (min và max)
            # Để tránh confidence 100% không hợp lý
            min_score = score_stats.get('min_score', -0.5)
            max_score = score_stats.get('max_score', -0.1)
            distance_from_min = abs(min_score - threshold_estimate)
            distance_from_max = abs(max_score - threshold_estimate)
            max_distance = max(distance_from_min, distance_from_max)
            
            # Tính confidence với uncertainty estimation
            if max_distance > 0:
                # Base confidence từ khoảng cách
                base_confidence = min(0.95, distance_to_threshold / max_distance)  # Cap ở 0.95
                
                # Điều chỉnh dựa trên std (uncertainty)
                # Nếu std cao → confidence thấp hơn (không chắc chắn)
                std_score = score_stats.get('std_score', 0.1)
                if std_score > 0:
                    # Normalize std (giả sử std thường trong khoảng 0.05-0.2)
                    normalized_std = min(1.0, std_score / 0.15)  # 0.15 là std điển hình
                    uncertainty_penalty = normalized_std * 0.2  # Giảm tối đa 20%
                    base_confidence = base_confidence * (1.0 - uncertainty_penalty)
                
                confidence_level = max(0.3, base_confidence)  # Tối thiểu 0.3
            else:
                confidence_level = 0.5
            
            # Điều chỉnh: Nếu score rất gần threshold → confidence thấp
            if abs(score - threshold_estimate) < 0.01:  # Rất gần threshold
                confidence_level = max(0.3, confidence_level * 0.7)
            
            # Điều chỉnh: Nếu score quá xa threshold (outlier) → giảm confidence một chút
            # Vì có thể là edge case không được train tốt
            if distance_to_threshold > max_distance * 0.8:  # Rất xa (>80% max distance)
                confidence_level = confidence_level * 0.9  # Giảm 10%
        else:
            # Fallback: Dùng anomaly_score để tính confidence
            # Score càng gần 0 hoặc 1 → confidence càng cao
            confidence_level = max(anomaly_score, 1.0 - anomaly_score) * 2.0 - 1.0
            confidence_level = max(0.0, min(1.0, confidence_level))
        
        return is_anomaly, float(anomaly_score), float(confidence_level)

