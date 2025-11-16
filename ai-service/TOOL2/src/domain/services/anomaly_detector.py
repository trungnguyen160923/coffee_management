"""
Anomaly Detector - Domain service for anomaly detection logic
"""
from typing import Tuple

from ..entities.anomaly import AnomalySeverity


class AnomalyDetector:
    """Domain service xử lý logic phát hiện bất thường"""
    
    @staticmethod
    def determine_severity(anomaly_score: float) -> AnomalySeverity:
        """
        Xác định mức độ nghiêm trọng dựa trên anomaly_score
        
        Args:
            anomaly_score: Điểm số bất thường (0-1)
        
        Returns:
            AnomalySeverity
        """
        if anomaly_score >= 0.8:
            return AnomalySeverity.CRITICAL
        elif anomaly_score >= 0.6:
            return AnomalySeverity.HIGH
        elif anomaly_score >= 0.4:
            return AnomalySeverity.MEDIUM
        else:
            return AnomalySeverity.LOW
    
    @staticmethod
    def normalize_anomaly_score(score: float, min_score: float = -0.5, max_score: float = -0.1) -> float:
        """
        Normalize anomaly score từ Isolation Forest sang range 0-1
        (higher = more anomalous)
        
        Args:
            score: Raw score từ Isolation Forest (lower = more anomalous)
            min_score: Minimum expected score
            max_score: Maximum expected score
        
        Returns:
            Normalized score (0-1)
        """
        normalized = (score - min_score) / (max_score - min_score)
        return max(0.0, min(1.0, 1 - normalized))  # Invert: higher score = more anomalous
    
    @staticmethod
    def normalize_anomaly_score_adaptive(score: float, score_stats: dict) -> float:
        """
        Normalize anomaly score với adaptive method dựa trên training data statistics
        Sử dụng percentile-based approach để robust hơn với outliers
        
        Args:
            score: Raw score từ Isolation Forest (lower = more anomalous)
            score_stats: Dict chứa statistics từ training data:
                - min_score: Minimum score trong training
                - max_score: Maximum score trong training
                - q25_score: 25th percentile
                - q75_score: 75th percentile
                - median_score: Median score
                - mean_score: Mean score
                - std_score: Standard deviation
        
        Returns:
            Normalized score (0-1), higher = more anomalous
        """
        min_score = score_stats.get('min_score', -0.5)
        max_score = score_stats.get('max_score', -0.1)
        q25 = score_stats.get('q25_score')
        q75 = score_stats.get('q75_score')
        median = score_stats.get('median_score')
        
        # Method 1: Percentile-based normalization (robust với outliers)
        # Sử dụng IQR (Interquartile Range) để xác định range
        if q25 is not None and q75 is not None:
            iqr = q75 - q25
            # Mở rộng range một chút để bao phủ outliers
            lower_bound = q25 - 1.5 * iqr
            upper_bound = q75 + 1.5 * iqr
            
            # Nếu score nằm ngoài IQR range, dùng min/max
            if score < lower_bound:
                # Score rất thấp (rất anomalous) → normalize về 1.0
                # Nhưng vẫn giữ một chút gradient
                if min_score is not None:
                    normalized = (score - min_score) / (lower_bound - min_score + 1e-10)
                    normalized = max(0.0, min(1.0, 1 - normalized))
                    # Clip scores rất thấp về 0.95-1.0 range
                    return min(1.0, max(0.95, normalized))
                else:
                    return 1.0
            elif score > upper_bound:
                # Score rất cao (rất normal) → normalize về 0.0
                if max_score is not None:
                    normalized = (score - upper_bound) / (max_score - upper_bound + 1e-10)
                    normalized = max(0.0, min(1.0, 1 - normalized))
                    # Clip scores rất cao về 0.0-0.05 range
                    return max(0.0, min(0.05, normalized))
                else:
                    return 0.0
            else:
                # Score nằm trong IQR range → normalize bình thường
                normalized = (score - lower_bound) / (upper_bound - lower_bound + 1e-10)
                return max(0.0, min(1.0, 1 - normalized))
        
        # Fallback: Dùng min/max nếu không có percentiles
        if min_score is not None and max_score is not None:
            normalized = (score - min_score) / (max_score - min_score + 1e-10)
            return max(0.0, min(1.0, 1 - normalized))
        
        # Final fallback: Dùng default values
        return AnomalyDetector.normalize_anomaly_score(score)

