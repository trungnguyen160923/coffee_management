"""
ML Trainer - Infrastructure service for training models
"""
import pickle
import json
from typing import Tuple, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from ...domain.entities.metrics import DailyBranchMetrics
from ...domain.entities.ml_model import MLModel


class MLTrainer:
    """Service để train ML models"""
    
    # Danh sách features dùng hiện tại (numeric, có trong daily_metrics.csv)
    FEATURES = [
        'total_revenue', 'order_count', 'avg_order_value',
        'customer_count', 'repeat_customers', 'new_customers',
        'unique_products_sold', 'product_diversity_score',
        'peak_hour', 'day_of_week', 'is_weekend',
        'avg_review_score'
    ]
    
    def prepare_training_data(self, metrics_list: list[DailyBranchMetrics]) -> Tuple[np.ndarray, StandardScaler]:
        """
        Chuẩn bị dữ liệu training từ metrics
        
        Args:
            metrics_list: List of DailyBranchMetrics entities
        
        Returns:
            X_scaled: numpy array (n_samples, n_features)
            scaler: StandardScaler đã fit
        """
        # Convert to dict
        data = [m.to_dict() for m in metrics_list]
        df = pd.DataFrame(data)
        
        # Chọn features (giả định các cột tồn tại trong CSV)
        X = df[self.FEATURES].copy()
        
        # Xử lý missing values: fill bằng median
        X = X.fillna(X.median(numeric_only=True))
        X = X.fillna(0)
        
        # Convert boolean thành int
        if 'is_weekend' in X.columns:
            X['is_weekend'] = X['is_weekend'].astype(int)
        
        # Normalize
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        return X_scaled, scaler
    
    def train(self, metrics_list: list[DailyBranchMetrics],
              n_estimators: int = 100, contamination: float = 0.1) -> Tuple[Any, StandardScaler, Dict]:
        """
        Train Isolation Forest model
        
        Args:
            metrics_list: List of DailyBranchMetrics entities
            n_estimators: Số trees trong Isolation Forest
            contamination: Tỷ lệ anomalies dự kiến
        
        Returns:
            model: Trained IsolationForest model
            scaler: StandardScaler đã fit
            metadata: Dict chứa metadata về training
        """
        # Chuẩn bị dữ liệu
        X, scaler = self.prepare_training_data(metrics_list)
        
        # Train model
        model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X)
        
        # Tính toán thống kê
        predictions = model.predict(X)
        anomaly_scores = model.score_samples(X)
        
        # Tính threshold chính xác từ contamination rate
        threshold_percentile = 100.0 * (1.0 - contamination)
        threshold_score = float(np.percentile(anomaly_scores, threshold_percentile))
        
        # Phân loại: -1 = anomaly, 1 = normal
        # Chuyển đổi: -1 -> 1 (anomaly), 1 -> 0 (normal) để tính metrics
        is_anomaly = predictions == -1
        num_anomalies = int(np.sum(is_anomaly))
        num_normal = int(np.sum(~is_anomaly))
        anomaly_rate = num_anomalies / len(predictions)
        
        # Thống kê chi tiết về anomaly scores
        anomaly_scores_normal = anomaly_scores[~is_anomaly]
        anomaly_scores_anomaly = anomaly_scores[is_anomaly]
        
        # Tính classification metrics (nếu có ground truth labels)
        # LƯU Ý: Isolation Forest là UNSUPERVISED learning, nên không có true labels
        # Các metrics này chỉ có ý nghĩa nếu có labeled validation data
        # Ở đây chúng ta có thể tính dựa trên contamination rate (giả định)
        # hoặc để None nếu không có ground truth
        classification_metrics = self._calculate_classification_metrics(
            predictions, anomaly_scores, contamination
        )
        
        # Metadata chi tiết
        metadata = {
            'training_samples': len(metrics_list),
            'training_date_start': str(metrics_list[0].report_date),
            'training_date_end': str(metrics_list[-1].report_date),
            'anomalies_in_training': num_anomalies,
            'normal_samples': num_normal,
            'anomaly_rate': float(anomaly_rate),
            'expected_contamination': contamination,
            # Thống kê tổng quát về scores
            'mean_anomaly_score': float(np.mean(anomaly_scores)),
            'std_anomaly_score': float(np.std(anomaly_scores)),
            'min_anomaly_score': float(np.min(anomaly_scores)),
            'max_anomaly_score': float(np.max(anomaly_scores)),
            'median_anomaly_score': float(np.median(anomaly_scores)),
            'q25_anomaly_score': float(np.percentile(anomaly_scores, 25)),
            'q75_anomaly_score': float(np.percentile(anomaly_scores, 75)),
            'threshold_score': threshold_score,  # Threshold chính xác từ contamination rate
            # Thống kê riêng cho normal samples
            'normal_mean_score': float(np.mean(anomaly_scores_normal)) if len(anomaly_scores_normal) > 0 else None,
            'normal_std_score': float(np.std(anomaly_scores_normal)) if len(anomaly_scores_normal) > 0 else None,
            # Thống kê riêng cho anomaly samples
            'anomaly_mean_score': float(np.mean(anomaly_scores_anomaly)) if len(anomaly_scores_anomaly) > 0 else None,
            'anomaly_std_score': float(np.std(anomaly_scores_anomaly)) if len(anomaly_scores_anomaly) > 0 else None,
            'anomaly_min_score': float(np.min(anomaly_scores_anomaly)) if len(anomaly_scores_anomaly) > 0 else None,
            'anomaly_max_score': float(np.max(anomaly_scores_anomaly)) if len(anomaly_scores_anomaly) > 0 else None,
            # Feature statistics
            'feature_stats': {
                feat: {
                    'mean': float(np.mean(X[:, i])),
                    'std': float(np.std(X[:, i])),
                    'min': float(np.min(X[:, i])),
                    'max': float(np.max(X[:, i]))
                }
                for i, feat in enumerate(self.FEATURES)
            },
            # Hyperparameters
            'n_estimators': n_estimators,
            'contamination': contamination,
            # Classification metrics (chỉ có ý nghĩa nếu có ground truth)
            **classification_metrics
        }
        
        return model, scaler, metadata
    
    def _calculate_classification_metrics(self, predictions: np.ndarray, 
                                          anomaly_scores: np.ndarray,
                                          contamination: float) -> Dict[str, Any]:
        """
        Tính các classification metrics (accuracy, precision, recall, F1)
        
        LƯU Ý QUAN TRỌNG:
        - Isolation Forest là UNSUPERVISED learning → không có ground truth labels
        - Các metrics này chỉ có ý nghĩa nếu có labeled validation data
        - Ở đây chúng ta tính dựa trên giả định contamination rate là đúng
          (tức là top N% samples có score thấp nhất là anomalies thực sự)
        
        Args:
            predictions: Model predictions (-1 = anomaly, 1 = normal)
            anomaly_scores: Anomaly scores từ model
            contamination: Contamination rate đã set
            
        Returns:
            Dict chứa các metrics (có thể None nếu không tính được)
        """
        # Chuyển đổi predictions: -1 -> 1 (anomaly), 1 -> 0 (normal)
        y_pred = (predictions == -1).astype(int)
        
        # Tạo "pseudo ground truth" dựa trên contamination rate
        # Giả định: top N% samples có score thấp nhất là anomalies thực sự
        n_anomalies_expected = int(len(anomaly_scores) * contamination)
        if n_anomalies_expected == 0:
            n_anomalies_expected = 1
        
        # Lấy indices của top N% samples có score thấp nhất
        sorted_indices = np.argsort(anomaly_scores)
        y_true = np.zeros(len(anomaly_scores), dtype=int)
        y_true[sorted_indices[:n_anomalies_expected]] = 1  # Mark as anomaly
        
        # Tính các metrics
        try:
            accuracy = float(accuracy_score(y_true, y_pred))
            precision = float(precision_score(y_true, y_pred, zero_division=0))
            recall = float(recall_score(y_true, y_pred, zero_division=0))
            f1 = float(f1_score(y_true, y_pred, zero_division=0))
            
            # Confusion matrix
            cm = confusion_matrix(y_true, y_pred)
            tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
            
            return {
                'accuracy_score': accuracy,
                'precision_score': precision,
                'recall_score': recall,
                'f1_score': f1,
                'confusion_matrix': {
                    'true_negatives': int(tn),
                    'false_positives': int(fp),
                    'false_negatives': int(fn),
                    'true_positives': int(tp)
                },
                'note': 'Metrics calculated using pseudo-ground-truth based on contamination rate. '
                       'For accurate metrics, labeled validation data is required.'
            }
        except Exception as e:
            # Nếu có lỗi, trả về None cho các metrics
            return {
                'accuracy_score': None,
                'precision_score': None,
                'recall_score': None,
                'f1_score': None,
                'confusion_matrix': None,
                'note': f'Could not calculate metrics: {str(e)}'
            }
    
    def save_model_to_repository(self, model_repository, branch_id: int,
                                 model, scaler, metadata: Dict,
                                 model_version: str, created_by: str) -> int:
        """
        Lưu model vào repository
        
        Args:
            model_repository: Model repository instance
            branch_id: ID chi nhánh
            model: Trained model
            scaler: StandardScaler
            metadata: Training metadata
            model_version: Phiên bản model
            created_by: Người tạo model
        
        Returns:
            ID của model đã lưu
        """
        model_name = f"iforest_anomaly_branch_{branch_id}"
        
        # Serialize model và scaler thành một object
        # Lưu score statistics để dùng cho normalization khi predict
        model_package = {
            'model': model,
            'scaler': scaler,
            'features': self.FEATURES,
            'score_stats': {
                'min_score': metadata['min_anomaly_score'],
                'max_score': metadata['max_anomaly_score'],
                'q25_score': metadata['q25_anomaly_score'],
                'q75_score': metadata['q75_anomaly_score'],
                'median_score': metadata['median_anomaly_score'],
                'mean_score': metadata['mean_anomaly_score'],
                'std_score': metadata['std_anomaly_score'],
                'contamination': metadata['contamination'],  # Thêm contamination rate
                'threshold_score': metadata['threshold_score'],  # Threshold chính xác từ contamination rate
                'threshold_percentile': 100.0 * (1.0 - metadata['contamination'])  # Percentile tương ứng
            }
        }
        model_binary = pickle.dumps(model_package)
        
        # Deactivate model cũ (cùng tên, bất kỳ version nào)
        model_repository.deactivate_by_name(model_name)
        
        # Xóa model cũ nếu đã có cùng (model_name, model_version)
        # (Để tránh lỗi duplicate key nếu chưa chạy migration)
        # Lưu ý: Sau khi chạy migration, có thể bỏ bước này vì UNIQUE sẽ cho phép nhiều version
        existing_model = model_repository.find_by_branch_and_version(branch_id, model_version)
        if existing_model:
            # Xóa model cũ cùng version (hoặc có thể update thay vì xóa)
            delete_query = "DELETE FROM ml_models WHERE id = %s"
            db_connection = model_repository.db
            db_connection.execute_query(delete_query, (existing_model.id,), fetch=False)
        
        # Tạo entity
        from datetime import date, datetime
        
        model_entity = MLModel(
            model_name=model_name,
            model_version=model_version,
            model_type="ISOLATION_FOREST",
            model_data=model_binary,
            hyperparameters=json.dumps({
                'n_estimators': model.n_estimators,
                'contamination': model.contamination,
                'random_state': model.random_state,
                # Quality log (audit) - stored alongside hyperparams for easy inspection in admin UI
                'quality_log': metadata.get('quality_log'),
                'training_summary': {
                    'training_samples': metadata.get('training_samples'),
                    'training_date_start': metadata.get('training_date_start'),
                    'training_date_end': metadata.get('training_date_end'),
                    'anomaly_rate': metadata.get('anomaly_rate'),
                    'threshold_score': metadata.get('threshold_score'),
                }
            }),
            feature_list=json.dumps(self.FEATURES),
            training_data_start_date=date.fromisoformat(metadata['training_date_start']),
            training_data_end_date=date.fromisoformat(metadata['training_date_end']),
            training_samples_count=metadata['training_samples'],
            training_data_stats=json.dumps(metadata['feature_stats']),
            # Performance metrics (có thể None nếu không tính được)
            accuracy_score=metadata.get('accuracy_score'),
            precision_score=metadata.get('precision_score'),
            recall_score=metadata.get('recall_score'),
            f1_score=metadata.get('f1_score'),
            is_active=True,
            is_production=False,
            created_by=created_by
        )
        
        # Lưu vào repository
        model_id = model_repository.save(model_entity)
        return model_id

