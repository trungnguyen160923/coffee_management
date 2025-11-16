"""
Forecast Predictor - Infrastructure service for making demand forecasts
"""
import pickle
import json
from typing import Tuple, Dict, Any, Optional
from datetime import date, timedelta
import numpy as np
import pandas as pd

from ...domain.entities.ml_model import MLModel
from ...domain.entities.forecast import ForecastResult


class ForecastPredictor:
    """Service để predict demand forecasts"""
    
    def load_model(self, model_entity: MLModel) -> Tuple[Any, Dict]:
        """
        Load model từ entity
        
        Args:
            model_entity: MLModel entity
        
        Returns:
            model: Trained forecasting model
            metadata: Model metadata
        """
        model = pickle.loads(model_entity.model_data)
        metadata = json.loads(model_entity.hyperparameters) if model_entity.hyperparameters else {}
        return model, metadata
    
    def predict_prophet(self, model: Any, periods: int, 
                       start_date: Optional[date] = None,
                       metadata: Optional[Dict] = None,
                       training_df: Optional[pd.DataFrame] = None) -> Tuple[Dict[str, float], Dict[str, Dict[str, float]]]:
        """
        Predict với Prophet
        
        Args:
            model: Trained Prophet model
            periods: Số ngày cần dự báo
            start_date: Ngày bắt đầu dự báo (nếu None thì dùng ngày tiếp theo sau training data)
            metadata: Model metadata (chứa external_regressors list)
            training_df: Training DataFrame (để tính giá trị trung bình cho external regressors)
        
        Returns:
            forecast_values: Dict {date_str: value}
            confidence_intervals: Dict {date_str: {lower: x, upper: y}}
        """
        # Tạo future dataframe
        if start_date:
            future_dates = pd.date_range(start=start_date, periods=periods, freq='D')
        else:
            # Lấy ngày cuối cùng từ training data và bắt đầu từ ngày tiếp theo
            future_dates = model.make_future_dataframe(periods=periods)
            future_dates = future_dates.tail(periods)['ds'].values
        
        future_df = pd.DataFrame({'ds': future_dates})
        
        # Thêm external regressors nếu model đã train với chúng
        external_regressors = []
        if metadata and metadata.get('use_external_regressors', False):
            external_regressors = metadata.get('external_regressors', [])
        
        if external_regressors and len(external_regressors) > 0:
            # Tính giá trị cho external regressors trong future dates
            for regressor in external_regressors:
                if regressor in ['day_of_week', 'is_weekend']:
                    # Tính từ date
                    if regressor == 'day_of_week':
                        future_df[regressor] = future_df['ds'].dt.dayofweek + 1  # 1-7
                    elif regressor == 'is_weekend':
                        future_df[regressor] = (future_df['ds'].dt.dayofweek >= 5).astype(int)
                elif regressor == 'peak_hour':
                    # Sử dụng giá trị trung bình từ training data
                    if training_df is not None and 'peak_hour' in training_df.columns:
                        avg_peak_hour = training_df['peak_hour'].mean()
                        future_df[regressor] = int(avg_peak_hour) if not pd.isna(avg_peak_hour) else 12
                    else:
                        future_df[regressor] = 12  # Default: giữa ngày
                else:
                    # Các regressor khác: sử dụng giá trị trung bình từ training data
                    if training_df is not None and regressor in training_df.columns:
                        avg_value = training_df[regressor].mean()
                        future_df[regressor] = float(avg_value) if not pd.isna(avg_value) else 0.0
                    else:
                        future_df[regressor] = 0.0
        
        # Predict
        forecast = model.predict(future_df)
        
        # Chuyển đổi thành dict
        forecast_values = {}
        confidence_intervals = {}
        
        for _, row in forecast.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            forecast_values[date_str] = float(row['yhat'])
            confidence_intervals[date_str] = {
                'lower': float(row['yhat_lower']),
                'upper': float(row['yhat_upper'])
            }
        
        return forecast_values, confidence_intervals
    
    def predict_lightgbm(self, model: Any, metadata: Dict, 
                        training_df: pd.DataFrame,
                        periods: int,
                        start_date: Optional[date] = None) -> Tuple[Dict[str, float], Dict[str, Dict[str, float]]]:
        """
        Predict với LightGBM
        
        Args:
            model: Trained LightGBM model
            metadata: Model metadata (chứa feature_cols)
            training_df: DataFrame training data (để tính lag features)
            periods: Số ngày cần dự báo
            start_date: Ngày bắt đầu dự báo
        
        Returns:
            forecast_values: Dict {date_str: value}
            confidence_intervals: Dict {date_str: {lower: x, upper: y}}
        """
        feature_cols = metadata.get('feature_cols', [])
        
        # Tạo future dates
        if start_date:
            future_dates = pd.date_range(start=start_date, periods=periods, freq='D')
        else:
            last_date = training_df['ds'].max()
            future_dates = pd.date_range(start=last_date + timedelta(days=1), periods=periods, freq='D')
        
        # Chuẩn bị dữ liệu để predict
        predictions = []
        confidence_intervals = {}
        
        # Sử dụng last values từ training data để tạo lag features
        # Lấy nhiều hơn để có đủ context (ít nhất 30, tốt nhất 60)
        if training_df is not None and len(training_df) > 0 and 'y' in training_df.columns:
            last_values = training_df['y'].tail(60).values.tolist()
        else:
            last_values = []
        
        # Xác định format day_of_week từ training data
        day_of_week_format = None
        if training_df is not None and len(training_df) > 0 and 'day_of_week' in training_df.columns:
            try:
                sample_dow = training_df['day_of_week'].iloc[0]
                if sample_dow >= 1 and sample_dow <= 7:
                    day_of_week_format = '1-7'
                else:
                    day_of_week_format = '0-6'
            except (IndexError, KeyError):
                day_of_week_format = '0-6'
        else:
            day_of_week_format = '0-6'
        
        for i, future_date in enumerate(future_dates):
            # Tạo features cho ngày này
            features = {}
            features['year'] = future_date.year
            features['month'] = future_date.month
            features['day'] = future_date.day
            # day_of_week: cần khớp với training (1-7 hoặc 0-6)
            if day_of_week_format == '1-7':
                features['day_of_week'] = future_date.weekday() + 1  # Convert 0-6 to 1-7
            else:
                features['day_of_week'] = future_date.weekday()
            features['week_of_year'] = future_date.isocalendar().week
            features['is_weekend'] = 1 if future_date.weekday() in [5, 6] else 0
            
            # Cyclical encoding (phải khớp với training)
            if day_of_week_format == '1-7':
                dow = future_date.weekday() + 1
            else:
                dow = future_date.weekday()
            
            features['day_of_week_sin'] = np.sin(2 * np.pi * dow / 7)
            features['day_of_week_cos'] = np.cos(2 * np.pi * dow / 7)
            features['month_sin'] = np.sin(2 * np.pi * future_date.month / 12)
            features['month_cos'] = np.cos(2 * np.pi * future_date.month / 12)
            features['day_sin'] = np.sin(2 * np.pi * future_date.day / 31)
            features['day_cos'] = np.cos(2 * np.pi * future_date.day / 31)
            features['week_of_year_sin'] = np.sin(2 * np.pi * future_date.isocalendar().week / 53)
            features['week_of_year_cos'] = np.cos(2 * np.pi * future_date.isocalendar().week / 53)
            
            # Thêm các features từ training data nếu có (peak_hour, etc.)
            # Sử dụng giá trị theo pattern (cùng ngày trong tuần) thay vì trung bình
            if training_df is not None and len(training_df) > 0:
                # Lấy giá trị từ cùng ngày trong tuần (7 ngày trước, 14 ngày trước, etc.)
                # để có biến động thay vì dùng trung bình
                day_of_week = features['day_of_week']
                
                # Tìm các ngày cùng thứ trong tuần từ training data
                same_weekday_data = training_df[training_df['day_of_week'] == day_of_week]
                
                if 'peak_hour' in feature_cols and 'peak_hour' in training_df.columns:
                    if len(same_weekday_data) > 0:
                        # Dùng giá trị gần nhất từ cùng ngày trong tuần
                        peak_hour_value = same_weekday_data['peak_hour'].iloc[-1]
                        features['peak_hour'] = int(peak_hour_value) if not pd.isna(peak_hour_value) else 12
                    else:
                        # Fallback về trung bình nếu không có dữ liệu
                        avg_peak_hour = training_df['peak_hour'].mean()
                        features['peak_hour'] = int(avg_peak_hour) if not pd.isna(avg_peak_hour) else 12
                
                # Thêm các features khác nếu có trong feature_cols
                for col in ['total_revenue', 'customer_count', 'order_count', 'avg_order_value']:
                    if col in feature_cols and col in training_df.columns:
                        if len(same_weekday_data) > 0:
                            # Dùng giá trị gần nhất từ cùng ngày trong tuần
                            col_value = same_weekday_data[col].iloc[-1]
                            features[col] = float(col_value) if not pd.isna(col_value) else 0.0
                        else:
                            # Fallback về trung bình
                            avg_value = training_df[col].mean()
                            features[col] = float(avg_value) if not pd.isna(avg_value) else 0.0
            
            # Lag features: ưu tiên dùng giá trị từ training data theo pattern
            # (cùng ngày trong tuần) để có biến động, sau đó mới dùng predictions
            if training_df is not None and len(training_df) > 0:
                # Tìm giá trị từ cùng ngày trong tuần (7, 14, 21, 28 ngày trước)
                day_of_week = features['day_of_week']
                same_weekday_data = training_df[training_df['day_of_week'] == day_of_week]
                
                # lag_1: ưu tiên dùng giá trị từ 7 ngày trước (cùng ngày trong tuần)
                if len(same_weekday_data) >= 1:
                    features['lag_1'] = float(same_weekday_data['y'].iloc[-1])
                elif len(predictions) > 0:
                    features['lag_1'] = predictions[-1]
                elif last_values:
                    features['lag_1'] = last_values[-1]
                else:
                    features['lag_1'] = 0
            else:
                # Fallback: dùng predictions hoặc last_values
                if i < 1:
                    features['lag_1'] = last_values[-1] if last_values else 0
                else:
                    features['lag_1'] = predictions[-1] if len(predictions) > 0 else (last_values[-1] if last_values else 0)
            
            # lag_7: ưu tiên dùng giá trị từ 14 ngày trước (cùng ngày trong tuần)
            if training_df is not None and len(training_df) > 0:
                if len(same_weekday_data) >= 2:
                    features['lag_7'] = float(same_weekday_data['y'].iloc[-2])  # 2 tuần trước
                elif len(same_weekday_data) >= 1:
                    features['lag_7'] = float(same_weekday_data['y'].iloc[-1])
                elif len(last_values) >= 7:
                    features['lag_7'] = last_values[-7]
                elif len(predictions) >= 7:
                    features['lag_7'] = predictions[-7]
                elif last_values:
                    features['lag_7'] = last_values[-1]
                else:
                    features['lag_7'] = 0
            else:
                # Fallback: dùng predictions hoặc last_values
                if i < 7:
                    if len(last_values) >= 7:
                        features['lag_7'] = last_values[-7]
                    elif len(last_values) > 0:
                        features['lag_7'] = last_values[-1]
                    else:
                        features['lag_7'] = 0
                else:
                    if len(predictions) >= 7:
                        features['lag_7'] = predictions[-7]
                    elif len(predictions) > 0:
                        features['lag_7'] = predictions[-1]
                    elif len(last_values) > 0:
                        features['lag_7'] = last_values[-1]
                    else:
                        features['lag_7'] = 0
            
            # lag_14: ưu tiên dùng giá trị từ 21 ngày trước (cùng ngày trong tuần)
            if training_df is not None and len(training_df) > 0:
                if len(same_weekday_data) >= 3:
                    features['lag_14'] = float(same_weekday_data['y'].iloc[-3])  # 3 tuần trước
                elif len(same_weekday_data) >= 2:
                    features['lag_14'] = float(same_weekday_data['y'].iloc[-2])
                elif len(same_weekday_data) >= 1:
                    features['lag_14'] = float(same_weekday_data['y'].iloc[-1])
                elif len(last_values) >= 14:
                    features['lag_14'] = last_values[-14]
                elif len(predictions) >= 14:
                    features['lag_14'] = predictions[-14]
                elif last_values:
                    features['lag_14'] = last_values[-1]
                else:
                    features['lag_14'] = 0
            else:
                # Fallback: dùng predictions hoặc last_values
                if i < 14:
                    if len(last_values) >= 14:
                        features['lag_14'] = last_values[-14]
                    elif len(last_values) > 0:
                        features['lag_14'] = last_values[-1]
                    else:
                        features['lag_14'] = 0
                else:
                    if len(predictions) >= 14:
                        features['lag_14'] = predictions[-14]
                    elif len(predictions) > 0:
                        features['lag_14'] = predictions[-1]
                    elif len(last_values) > 0:
                        features['lag_14'] = last_values[-1]
                    else:
                        features['lag_14'] = 0
            
            # lag_30: ưu tiên dùng giá trị từ 28-35 ngày trước (cùng ngày trong tuần)
            if training_df is not None and len(training_df) > 0:
                if len(same_weekday_data) >= 4:
                    features['lag_30'] = float(same_weekday_data['y'].iloc[-4])  # 4 tuần trước
                elif len(same_weekday_data) >= 3:
                    features['lag_30'] = float(same_weekday_data['y'].iloc[-3])
                elif len(same_weekday_data) >= 2:
                    features['lag_30'] = float(same_weekday_data['y'].iloc[-2])
                elif len(same_weekday_data) >= 1:
                    features['lag_30'] = float(same_weekday_data['y'].iloc[-1])
                elif len(last_values) >= 30:
                    features['lag_30'] = last_values[-30]
                elif len(predictions) >= 30:
                    features['lag_30'] = predictions[-30]
                elif last_values:
                    features['lag_30'] = last_values[-1]
                else:
                    features['lag_30'] = 0
            else:
                # Fallback: dùng predictions hoặc last_values
                if i < 30:
                    if len(last_values) >= 30:
                        features['lag_30'] = last_values[-30]
                    elif len(last_values) > 0:
                        features['lag_30'] = last_values[-1]
                    else:
                        features['lag_30'] = 0
                else:
                    if len(predictions) >= 30:
                        features['lag_30'] = predictions[-30]
                    elif len(predictions) > 0:
                        features['lag_30'] = predictions[-1]
                    elif len(last_values) > 0:
                        features['lag_30'] = last_values[-1]
                    else:
                        features['lag_30'] = 0
            
            # Rolling features (sử dụng predictions trước đó hoặc last values)
            if i >= 7:
                # Kết hợp predictions và last_values
                if len(predictions) >= 7:
                    recent_values = predictions[-7:]
                else:
                    # Kết hợp predictions và last_values để đủ 7 giá trị
                    needed_from_training = 7 - len(predictions)
                    if len(last_values) >= needed_from_training:
                        recent_values = predictions + last_values[-needed_from_training:]
                    elif len(last_values) > 0:
                        recent_values = predictions + last_values
                    else:
                        recent_values = predictions if len(predictions) > 0 else [0]
                
                if len(recent_values) >= 7:
                    features['rolling_mean_7'] = np.mean(recent_values[-7:])
                    features['rolling_std_7'] = np.std(recent_values[-7:]) if len(recent_values) > 1 else 0
                else:
                    features['rolling_mean_7'] = np.mean(recent_values) if len(recent_values) > 0 else 0
                    features['rolling_std_7'] = np.std(recent_values) if len(recent_values) > 1 else 0
            else:
                # Chưa đủ 7 predictions, dùng last_values
                if len(last_values) >= 7:
                    recent_values = last_values[-7:]
                elif len(last_values) > 0:
                    recent_values = last_values
                else:
                    recent_values = [0]
                
                features['rolling_mean_7'] = np.mean(recent_values) if len(recent_values) > 0 else 0
                features['rolling_std_7'] = np.std(recent_values) if len(recent_values) > 1 else 0
            
            if i >= 14:
                if len(predictions) >= 14:
                    recent_values = predictions[-14:]
                else:
                    needed_from_training = 14 - len(predictions)
                    if len(last_values) >= needed_from_training:
                        recent_values = predictions + last_values[-needed_from_training:]
                    elif len(last_values) > 0:
                        recent_values = predictions + last_values
                    else:
                        recent_values = predictions if len(predictions) > 0 else [0]
                
                if len(recent_values) >= 14:
                    features['rolling_mean_14'] = np.mean(recent_values[-14:])
                    features['rolling_std_14'] = np.std(recent_values[-14:]) if len(recent_values) > 1 else 0
                else:
                    features['rolling_mean_14'] = np.mean(recent_values) if len(recent_values) > 0 else 0
                    features['rolling_std_14'] = np.std(recent_values) if len(recent_values) > 1 else 0
            else:
                if len(last_values) >= 14:
                    recent_values = last_values[-14:]
                elif len(last_values) > 0:
                    recent_values = last_values
                else:
                    recent_values = [0]
                
                features['rolling_mean_14'] = np.mean(recent_values) if len(recent_values) > 0 else 0
                features['rolling_std_14'] = np.std(recent_values) if len(recent_values) > 1 else 0
            
            if i >= 30:
                if len(predictions) >= 30:
                    recent_values = predictions[-30:]
                else:
                    needed_from_training = 30 - len(predictions)
                    if len(last_values) >= needed_from_training:
                        recent_values = predictions + last_values[-needed_from_training:]
                    elif len(last_values) > 0:
                        recent_values = predictions + last_values
                    else:
                        recent_values = predictions if len(predictions) > 0 else [0]
                
                if len(recent_values) >= 30:
                    features['rolling_mean_30'] = np.mean(recent_values[-30:])
                    features['rolling_std_30'] = np.std(recent_values[-30:]) if len(recent_values) > 1 else 0
                else:
                    features['rolling_mean_30'] = np.mean(recent_values) if len(recent_values) > 0 else 0
                    features['rolling_std_30'] = np.std(recent_values) if len(recent_values) > 1 else 0
            else:
                if len(last_values) >= 30:
                    recent_values = last_values[-30:]
                elif len(last_values) > 0:
                    recent_values = last_values
                else:
                    recent_values = [0]
                
                features['rolling_mean_30'] = np.mean(recent_values) if len(recent_values) > 0 else 0
                features['rolling_std_30'] = np.std(recent_values) if len(recent_values) > 1 else 0
            
            # Rate of change features (tỷ lệ thay đổi)
            # Tính từ giá trị trước đó (last_values hoặc predictions đã có)
            if 'roc_1' in feature_cols:
                if len(predictions) > 0 and len(last_values) > 0:
                    # Có prediction trước đó và last values
                    # roc_1 = (prediction trước đó - last value) / last value
                    prev_pred = predictions[-1]
                    prev_actual = last_values[-1]
                    if prev_actual > 0:
                        features['roc_1'] = (prev_pred - prev_actual) / prev_actual
                    else:
                        features['roc_1'] = 0
                elif len(last_values) >= 2:
                    # Chưa có prediction, tính từ 2 last values
                    if last_values[-1] > 0:
                        features['roc_1'] = (last_values[-1] - last_values[-2]) / last_values[-2]
                    else:
                        features['roc_1'] = 0
                else:
                    features['roc_1'] = 0
            
            if 'roc_7' in feature_cols:
                if len(predictions) >= 7 and predictions[-7] > 0:
                    features['roc_7'] = (predictions[-1] if len(predictions) > 0 else 0 - predictions[-7]) / predictions[-7]
                elif len(last_values) >= 7 and last_values[-7] > 0:
                    current = predictions[-1] if len(predictions) > 0 else last_values[-1]
                    features['roc_7'] = (current - last_values[-7]) / last_values[-7]
                else:
                    features['roc_7'] = 0
            
            if 'roc_30' in feature_cols:
                if len(predictions) >= 30 and predictions[-30] > 0:
                    features['roc_30'] = (predictions[-1] if len(predictions) > 0 else 0 - predictions[-30]) / predictions[-30]
                elif len(last_values) >= 30 and last_values[-30] > 0:
                    current = predictions[-1] if len(predictions) > 0 else last_values[-1]
                    features['roc_30'] = (current - last_values[-30]) / last_values[-30]
                else:
                    features['roc_30'] = 0
            
            # Percentile features (vị trí trong distribution)
            for window in [7, 14, 30]:
                if f'percentile_{window}' in feature_cols:
                    # Tính rolling mean và std từ recent values
                    if i >= window:
                        if len(predictions) >= window:
                            recent_values = predictions[-window:]
                        else:
                            needed = window - len(predictions)
                            if len(last_values) >= needed:
                                recent_values = predictions + last_values[-needed:]
                            else:
                                recent_values = predictions + last_values
                        
                        if len(recent_values) >= window:
                            rolling_mean = np.mean(recent_values[-window:])
                            rolling_std = np.std(recent_values[-window:])
                            current_value = predictions[-1] if len(predictions) > 0 else (last_values[-1] if last_values else 0)
                            features[f'percentile_{window}'] = (current_value - rolling_mean) / (rolling_std + 1e-6)
                        else:
                            features[f'percentile_{window}'] = 0
                    else:
                        # Chưa đủ data, dùng 0
                        features[f'percentile_{window}'] = 0
            
            # Tạo feature vector - đảm bảo đúng thứ tự và đủ features
            X_values = [features.get(col, 0) for col in feature_cols]
            X = np.array([X_values])
            
            # Predict - suppress warning nếu cần
            import warnings
            with warnings.catch_warnings():
                warnings.filterwarnings('ignore', category=UserWarning, message='.*feature names.*')
            pred = model.predict(X)[0]
            pred_value = max(0, pred)  # Đảm bảo không âm
            predictions.append(pred_value)
            
            # Update roc_1 sau khi có prediction
            if 'roc_1' in feature_cols and len(predictions) > 1:
                prev_value = predictions[-2] if len(predictions) > 1 else (last_values[-1] if last_values else 0)
                if prev_value > 0:
                    # Update roc_1 cho prediction tiếp theo (không ảnh hưởng prediction hiện tại)
                    # Lưu ý: roc_1 cho prediction hiện tại đã được set = 0 ở trên
                    pass  # Không cần update vì đã predict xong
            
            # Confidence interval (ước tính dựa trên std của training data)
            # Đơn giản: ±20% của prediction
            std_estimate = abs(pred) * 0.2
            confidence_intervals[future_date.strftime('%Y-%m-%d')] = {
                'lower': max(0, pred - 1.96 * std_estimate),
                'upper': pred + 1.96 * std_estimate
            }
        
        # Chuyển đổi thành dict
        forecast_values = {
            date.strftime('%Y-%m-%d'): float(value)
            for date, value in zip(future_dates, predictions)
        }
        
        return forecast_values, confidence_intervals
    
    def predict_xgboost(self, model: Any, metadata: Dict,
                       training_df: pd.DataFrame,
                       periods: int,
                       start_date: Optional[date] = None) -> Tuple[Dict[str, float], Dict[str, Dict[str, float]]]:
        """
        Predict với XGBoost (tương tự LightGBM)
        """
        return self.predict_lightgbm(model, metadata, training_df, periods, start_date)
    
    def predict(self, model_entity: MLModel,
                training_metrics: list,
                periods: int,
                start_date: Optional[date] = None) -> Tuple[Dict[str, float], Dict[str, Dict[str, float]]]:
        """
        Predict demand forecast
        
        Args:
            model_entity: MLModel entity
            training_metrics: List of DailyBranchMetrics (để tính lag features cho tree-based models)
            periods: Số ngày cần dự báo
            start_date: Ngày bắt đầu dự báo
        
        Returns:
            forecast_values: Dict {date_str: value}
            confidence_intervals: Dict {date_str: {lower: x, upper: y}}
        """
        model, metadata = self.load_model(model_entity)
        algorithm = model_entity.model_type
        
        if algorithm == 'PROPHET':
            # Lấy training_df từ training_metrics nếu có external regressors
            training_df = None
            if metadata.get('use_external_regressors', False) and training_metrics:
                from .forecast_trainer import ForecastTrainer
                trainer = ForecastTrainer()
                target_metric = metadata.get('target_metric', 'order_count')
                training_df = trainer.prepare_time_series_data(training_metrics, target_metric)
            return self.predict_prophet(model, periods, start_date, metadata, training_df)
        elif algorithm == 'LIGHTGBM':
            # Chuẩn bị training_df từ metrics
            from .forecast_trainer import ForecastTrainer
            trainer = ForecastTrainer()
            target_metric = metadata.get('target_metric', 'order_count')
            training_df = trainer.prepare_time_series_data(training_metrics, target_metric)
            return self.predict_lightgbm(model, metadata, training_df, periods, start_date)
        elif algorithm == 'XGBOOST':
            from .forecast_trainer import ForecastTrainer
            trainer = ForecastTrainer()
            target_metric = metadata.get('target_metric', 'order_count')
            training_df = trainer.prepare_time_series_data(training_metrics, target_metric)
            return self.predict_xgboost(model, metadata, training_df, periods, start_date)
        else:
            raise ValueError(f"Algorithm không được hỗ trợ: {algorithm}")
    
    def calculate_metrics(self, actual_values: Dict[str, float],
                         forecast_values: Dict[str, float]) -> Dict[str, float]:
        """
        Tính performance metrics (MAE, MSE, RMSE, MAPE)
        
        Args:
            actual_values: Dict {date_str: actual_value}
            forecast_values: Dict {date_str: forecast_value}
        
        Returns:
            Dict với các metrics
        """
        # Lấy các dates chung
        common_dates = set(actual_values.keys()) & set(forecast_values.keys())
        
        if len(common_dates) == 0:
            return {
                'mae': None,
                'mse': None,
                'rmse': None,
                'mape': None
            }
        
        actual = np.array([actual_values[d] for d in sorted(common_dates)])
        forecast = np.array([forecast_values[d] for d in sorted(common_dates)])
        
        # Tính metrics
        mae = np.mean(np.abs(actual - forecast))
        mse = np.mean((actual - forecast) ** 2)
        rmse = np.sqrt(mse)
        
        # MAPE (tránh chia cho 0)
        mask = actual != 0
        if np.sum(mask) > 0:
            mape = np.mean(np.abs((actual[mask] - forecast[mask]) / actual[mask])) * 100
        else:
            mape = None
        
        return {
            'mae': float(mae),
            'mse': float(mse),
            'rmse': float(rmse),
            'mape': float(mape) if mape is not None else None
        }

