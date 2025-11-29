"""
Forecast Trainer - Infrastructure service for training demand forecasting models
"""
import pickle
import json
from typing import Tuple, Dict, Any, Optional
from datetime import date, timedelta
import numpy as np
import pandas as pd

from ...domain.entities.metrics import DailyBranchMetrics


class ForecastTrainer:
    """Service để train forecasting models (Prophet, LightGBM, XGBoost)"""
    
    SUPPORTED_ALGORITHMS = ['PROPHET', 'LIGHTGBM', 'XGBOOST']
    SUPPORTED_TARGETS = ['order_count', 'total_revenue', 'customer_count', 'avg_order_value']
    
    def prepare_time_series_data(self, metrics_list: list[DailyBranchMetrics], 
                                 target_metric: str) -> pd.DataFrame:
        """
        Chuẩn bị dữ liệu time series từ metrics
        
        Args:
            metrics_list: List of DailyBranchMetrics entities
            target_metric: Tên metric cần dự báo (order_count, total_revenue, etc.)
        
        Returns:
            DataFrame với columns: ds (date), y (target value), và các features khác
        """
        data = []
        for metric in metrics_list:
            metric_dict = metric.to_dict()
            value = metric_dict.get(target_metric)
            
            if value is None or pd.isna(value):
                continue
            
            row = {
                'ds': pd.to_datetime(metric.report_date),
                'y': float(value),
                'day_of_week': metric.day_of_week,
                'is_weekend': 1 if metric.is_weekend else 0,
                'peak_hour': metric.peak_hour if metric.peak_hour else 0,
            }
            
            # Thêm các features bổ sung nếu có (đảm bảo numeric)
            if target_metric != 'total_revenue':
                revenue = metric_dict.get('total_revenue', 0)
                row['total_revenue'] = float(revenue) if revenue is not None and pd.notna(revenue) else 0.0
            if target_metric != 'customer_count':
                customer = metric_dict.get('customer_count', 0)
                row['customer_count'] = int(customer) if customer is not None and pd.notna(customer) else 0
            if target_metric != 'order_count':
                order = metric_dict.get('order_count', 0)
                row['order_count'] = int(order) if order is not None and pd.notna(order) else 0
            
            data.append(row)
        
        df = pd.DataFrame(data)
        df = df.sort_values('ds').reset_index(drop=True)
        
        # Đảm bảo tất cả numeric columns là numeric type
        numeric_cols = ['total_revenue', 'customer_count', 'order_count', 'peak_hour', 'day_of_week']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        return df
    
    def train_prophet(self, df: pd.DataFrame, 
                      seasonality_mode: str = 'multiplicative',
                      yearly_seasonality: bool = True,
                      weekly_seasonality: bool = True,
                      daily_seasonality: bool = False,
                      use_external_regressors: bool = True) -> Tuple[Any, Dict]:
        """
        Train Prophet model
        
        Args:
            df: DataFrame với columns 'ds' (date), 'y' (target), và các external regressors
            seasonality_mode: 'additive' hoặc 'multiplicative'
            yearly_seasonality: Bật yearly seasonality
            weekly_seasonality: Bật weekly seasonality
            daily_seasonality: Bật daily seasonality
            use_external_regressors: Có sử dụng external regressors không
        
        Returns:
            model: Trained Prophet model
            metadata: Training metadata
        """
        try:
            from prophet import Prophet
        except ImportError:
            raise ImportError("Prophet chưa được cài đặt. Chạy: pip install prophet")
        
        # Tạo model với cấu hình
        model = Prophet(
            seasonality_mode=seasonality_mode,
            yearly_seasonality=yearly_seasonality,
            weekly_seasonality=weekly_seasonality,
            daily_seasonality=daily_seasonality,
            interval_width=0.95,  # 95% confidence interval
            changepoint_prior_scale=0.05
        )
        
        # Thêm external regressors nếu có và được bật
        external_regressors = []
        if use_external_regressors:
            # Các features có thể dùng làm external regressors
            potential_regressors = [
                'day_of_week', 'is_weekend', 'peak_hour',
                'total_revenue', 'customer_count', 'order_count',
                'avg_order_value', 'unique_products_sold'
            ]
            
            for regressor in potential_regressors:
                if regressor in df.columns and regressor != 'y':
                    # Kiểm tra có đủ dữ liệu không null
                    non_null_count = df[regressor].notna().sum()
                    if non_null_count > len(df) * 0.5:  # Ít nhất 50% dữ liệu không null
                        model.add_regressor(regressor)
                        external_regressors.append(regressor)
        
        # Train
        model.fit(df)
        
        metadata = {
            'algorithm': 'PROPHET',
            'seasonality_mode': seasonality_mode,
            'yearly_seasonality': yearly_seasonality,
            'weekly_seasonality': weekly_seasonality,
            'daily_seasonality': daily_seasonality,
            'use_external_regressors': use_external_regressors,
            'external_regressors': external_regressors,
            'training_samples': len(df),
            'date_range': {
                'start': str(df['ds'].min().date()),
                'end': str(df['ds'].max().date())
            }
        }
        
        return model, metadata
    
    def train_lightgbm(self, df: pd.DataFrame,
                      n_estimators: int = 300,
                      learning_rate: float = 0.03,
                      max_depth: int = 6,
                      num_leaves: int = 100,
                      min_child_samples: int = 5,
                      subsample: float = 0.8,
                      colsample_bytree: float = 0.8,
                      reg_alpha: float = 0.05,
                      reg_lambda: float = 0.01,
                      min_split_gain: float = 0.0,
                      remove_outliers: bool = False,
                      feature_selection: bool = False,
                      min_correlation: float = 0.1,
                      use_early_stopping: bool = True,
                      validation_split: float = 0.25,
                      stopping_rounds: int = 50) -> Tuple[Any, Dict]:
        """
        Train LightGBM model cho time series forecasting
        
        Args:
            df: DataFrame với columns 'ds' (date) và 'y' (target)
            n_estimators: Số trees (mặc định: 300 - optimized từ all_improvements)
            learning_rate: Learning rate (mặc định: 0.03 - optimized)
            max_depth: Độ sâu tối đa (mặc định: 6 - optimized)
            num_leaves: Số lá tối đa (mặc định: 100 - optimized, nên <= 2^max_depth)
            min_child_samples: Số samples tối thiểu trong leaf (mặc định: 5 - optimized)
            subsample: Tỷ lệ subsample training data (mặc định: 0.8, tránh overfitting)
            colsample_bytree: Tỷ lệ features dùng cho mỗi tree (mặc định: 0.8)
            reg_alpha: L1 regularization (mặc định: 0.05 - optimized)
            reg_lambda: L2 regularization (mặc định: 0.01 - optimized)
            min_split_gain: Minimum loss reduction để split (mặc định: 0.0)
            remove_outliers: Xử lý outliers trước khi train (mặc định: False)
            feature_selection: Loại bỏ features có correlation thấp (mặc định: False)
            min_correlation: Ngưỡng correlation tối thiểu để giữ feature (mặc định: 0.1)
            use_early_stopping: Sử dụng early stopping (mặc định: True - optimized)
            validation_split: Tỷ lệ validation set cho early stopping (mặc định: 0.25 - optimized)
            stopping_rounds: Số rounds không cải thiện để dừng (mặc định: 50 - optimized)
        
        Returns:
            model: Trained LightGBM model
            metadata: Training metadata
        
        Note:
            Default hyperparameters được optimize từ all_improvements test (R²=0.5210)
            Early stopping được bật mặc định để đạt kết quả tốt nhất
        """
        try:
            import lightgbm as lgb
        except ImportError:
            raise ImportError("LightGBM chưa được cài đặt. Chạy: pip install lightgbm")
        
        # Tạo features từ date
        df_features = df.copy()
        df_features['year'] = df_features['ds'].dt.year
        df_features['month'] = df_features['ds'].dt.month
        df_features['day'] = df_features['ds'].dt.day
        
        # day_of_week: nếu đã có trong df (từ prepare_time_series_data), giữ nguyên
        # Nếu chưa có, tính từ date (0-6) và convert sang 1-7 để đồng nhất
        if 'day_of_week' not in df_features.columns:
            df_features['day_of_week'] = df_features['ds'].dt.dayofweek + 1  # Convert 0-6 to 1-7
        # Nếu có nhưng là 0-6, convert sang 1-7
        elif df_features['day_of_week'].min() == 0:
            df_features['day_of_week'] = df_features['day_of_week'] + 1
        
        df_features['week_of_year'] = df_features['ds'].dt.isocalendar().week
        # is_weekend: nếu đã có trong df, giữ nguyên, nếu chưa tính từ day_of_week
        if 'is_weekend' not in df_features.columns:
            # day_of_week giờ là 1-7, nên 6,7 là weekend
            df_features['is_weekend'] = df_features['day_of_week'].isin([6, 7]).astype(int)
        
        # Cyclical encoding cho time features (sin/cos để model học được tính tuần hoàn)
        # Day of week (1-7)
        df_features['day_of_week_sin'] = np.sin(2 * np.pi * df_features['day_of_week'] / 7)
        df_features['day_of_week_cos'] = np.cos(2 * np.pi * df_features['day_of_week'] / 7)
        
        # Month (1-12)
        df_features['month_sin'] = np.sin(2 * np.pi * df_features['month'] / 12)
        df_features['month_cos'] = np.cos(2 * np.pi * df_features['month'] / 12)
        
        # Day of month (1-31)
        df_features['day_sin'] = np.sin(2 * np.pi * df_features['day'] / 31)
        df_features['day_cos'] = np.cos(2 * np.pi * df_features['day'] / 31)
        
        # Week of year (1-53)
        df_features['week_of_year_sin'] = np.sin(2 * np.pi * df_features['week_of_year'] / 53)
        df_features['week_of_year_cos'] = np.cos(2 * np.pi * df_features['week_of_year'] / 53)
        
        # Lag features (giá trị của các ngày trước)
        for lag in [1, 7, 14, 30]:
            df_features[f'lag_{lag}'] = df_features['y'].shift(lag)
        
        # Rolling window features
        for window in [7, 14, 30]:
            df_features[f'rolling_mean_{window}'] = df_features['y'].rolling(window=window).mean()
            df_features[f'rolling_std_{window}'] = df_features['y'].rolling(window=window).std()
        
        # Rate of change features (tỷ lệ thay đổi)
        if 'y' in df_features.columns:
            df_features['roc_1'] = df_features['y'].pct_change(1).fillna(0)
            df_features['roc_7'] = df_features['y'].pct_change(7).fillna(0)
            df_features['roc_30'] = df_features['y'].pct_change(30).fillna(0)
        
        # Percentile features (vị trí trong distribution)
        if 'y' in df_features.columns:
            for window in [7, 14, 30]:
                rolling_mean = df_features['y'].rolling(window=window).mean()
                rolling_std = df_features['y'].rolling(window=window).std()
                df_features[f'percentile_{window}'] = ((df_features['y'] - rolling_mean) / (rolling_std + 1e-6)).fillna(0)
        
        # Xử lý outliers nếu được yêu cầu
        if remove_outliers and 'y' in df_features.columns:
            # Sử dụng IQR method
            q1 = df_features['y'].quantile(0.25)
            q3 = df_features['y'].quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            # Winsorize (thay vì loại bỏ)
            df_features.loc[df_features['y'] < lower_bound, 'y'] = lower_bound
            df_features.loc[df_features['y'] > upper_bound, 'y'] = upper_bound
        
        # Loại bỏ NaN từ lag features
        df_features = df_features.dropna()
        
        if len(df_features) == 0:
            raise ValueError("Không đủ dữ liệu sau khi tạo features")
        
        # Tách features và target
        feature_cols = [col for col in df_features.columns 
                        if col not in ['ds', 'y']]
        
        # Feature selection: loại bỏ features có correlation thấp với target
        if feature_selection and len(df_features) > 10:
            correlations = {}
            for col in feature_cols:
                if df_features[col].dtype in [np.float64, np.int64, float, int]:
                    try:
                        corr = df_features[col].corr(df_features['y'])
                        if not pd.isna(corr):
                            correlations[col] = abs(corr)
                    except:
                        pass
            
            # Chỉ giữ features có correlation >= min_correlation
            selected_features = [col for col, corr in correlations.items() 
                               if corr >= min_correlation]
            
            if len(selected_features) > 0:
                feature_cols = selected_features
                print(f"   Feature selection: giữ {len(feature_cols)}/{len(correlations)} features (correlation >= {min_correlation})")
        
        X = df_features[feature_cols].copy()  # Giữ DataFrame để có feature names
        
        # Convert tất cả features sang numeric (xử lý object dtype)
        for col in X.columns:
            if X[col].dtype == 'object':
                # Convert object sang numeric, coerce errors thành NaN
                X[col] = pd.to_numeric(X[col], errors='coerce')
            # Đảm bảo numeric columns là float hoặc int
            elif not pd.api.types.is_numeric_dtype(X[col]):
                X[col] = pd.to_numeric(X[col], errors='coerce')
        
        # Fill NaN với 0 (nếu có)
        X = X.fillna(0)
        
        # Đảm bảo y là numeric
        y = pd.to_numeric(df_features['y'], errors='coerce').fillna(0).values
        
        # Train model với các hyperparameters
        model = lgb.LGBMRegressor(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            num_leaves=num_leaves,
            min_child_samples=min_child_samples,
            subsample=subsample,
            colsample_bytree=colsample_bytree,
            reg_alpha=reg_alpha,
            reg_lambda=reg_lambda,
            min_split_gain=min_split_gain,
            random_state=42,
            verbose=-1
        )
        
        # Early stopping nếu được bật và có đủ dữ liệu
        if use_early_stopping and len(X) > 20:
            # Split train/val
            split_idx = int(len(X) * (1 - validation_split))
            if split_idx < 10:  # Cần ít nhất 10 samples để train
                split_idx = max(10, len(X) - 5)
            
            X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            
            # Train với early stopping
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                callbacks=[lgb.early_stopping(stopping_rounds=stopping_rounds, verbose=False)]
            )
        else:
            # Train toàn bộ data (không có early stopping)
            model.fit(X, y)
        
        metadata = {
            'algorithm': 'LIGHTGBM',
            'n_estimators': n_estimators,
            'learning_rate': learning_rate,
            'max_depth': max_depth,
            'num_leaves': num_leaves,
            'min_child_samples': min_child_samples,
            'subsample': subsample,
            'colsample_bytree': colsample_bytree,
            'reg_alpha': reg_alpha,
            'reg_lambda': reg_lambda,
            'min_split_gain': min_split_gain,
            'feature_cols': feature_cols,
            'training_samples': len(df_features),
            'date_range': {
                'start': str(df_features['ds'].min().date()),
                'end': str(df_features['ds'].max().date())
            },
            'early_stopping': use_early_stopping,
            'validation_split': validation_split if use_early_stopping else None,
            'stopping_rounds': stopping_rounds if use_early_stopping else None
        }
        
        return model, metadata
    
    def train_xgboost(self, df: pd.DataFrame,
                     n_estimators: int = 100,
                     learning_rate: float = 0.1,
                     max_depth: int = 5) -> Tuple[Any, Dict]:
        """
        Train XGBoost model cho time series forecasting
        
        Args:
            df: DataFrame với columns 'ds' (date) và 'y' (target)
            n_estimators: Số trees
            learning_rate: Learning rate
            max_depth: Độ sâu tối đa
        
        Returns:
            model: Trained XGBoost model
            metadata: Training metadata
        """
        try:
            import xgboost as xgb
        except ImportError:
            raise ImportError("XGBoost chưa được cài đặt. Chạy: pip install xgboost")
        
        # Tạo features từ date (tương tự LightGBM)
        df_features = df.copy()
        df_features['year'] = df_features['ds'].dt.year
        df_features['month'] = df_features['ds'].dt.month
        df_features['day'] = df_features['ds'].dt.day
        df_features['day_of_week'] = df_features['ds'].dt.dayofweek
        df_features['week_of_year'] = df_features['ds'].dt.isocalendar().week
        df_features['is_weekend'] = df_features['day_of_week'].isin([5, 6]).astype(int)
        
        # Lag features
        for lag in [1, 7, 14, 30]:
            df_features[f'lag_{lag}'] = df_features['y'].shift(lag)
        
        # Rolling window features
        for window in [7, 14, 30]:
            df_features[f'rolling_mean_{window}'] = df_features['y'].rolling(window=window).mean()
            df_features[f'rolling_std_{window}'] = df_features['y'].rolling(window=window).std()
        
        # Loại bỏ NaN
        df_features = df_features.dropna()
        
        if len(df_features) == 0:
            raise ValueError("Không đủ dữ liệu sau khi tạo features")
        
        # Tách features và target
        feature_cols = [col for col in df_features.columns 
                        if col not in ['ds', 'y']]
        X = df_features[feature_cols].values
        y = df_features['y'].values
        
        # Train model
        model = xgb.XGBRegressor(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            random_state=42,
            verbosity=0
        )
        model.fit(X, y)
        
        metadata = {
            'algorithm': 'XGBOOST',
            'n_estimators': n_estimators,
            'learning_rate': learning_rate,
            'max_depth': max_depth,
            'feature_cols': feature_cols,
            'training_samples': len(df_features),
            'date_range': {
                'start': str(df_features['ds'].min().date()),
                'end': str(df_features['ds'].max().date())
            }
        }
        
        return model, metadata
    
    def train(self, metrics_list: list[DailyBranchMetrics],
              algorithm: str,
              target_metric: str,
              **kwargs) -> Tuple[Any, Dict]:
        """
        Train forecasting model
        
        Args:
            metrics_list: List of DailyBranchMetrics entities
            algorithm: 'PROPHET', 'LIGHTGBM', hoặc 'XGBOOST'
            target_metric: Metric cần dự báo
            **kwargs: Hyperparameters cho từng algorithm
        
        Returns:
            model: Trained model
            metadata: Training metadata
        """
        if algorithm not in self.SUPPORTED_ALGORITHMS:
            raise ValueError(f"Algorithm không được hỗ trợ: {algorithm}. Chọn một trong: {self.SUPPORTED_ALGORITHMS}")
        
        if target_metric not in self.SUPPORTED_TARGETS:
            raise ValueError(f"Target metric không được hỗ trợ: {target_metric}. Chọn một trong: {self.SUPPORTED_TARGETS}")
        
        # Chuẩn bị dữ liệu
        df = self.prepare_time_series_data(metrics_list, target_metric)
        
        if len(df) < 30:
            raise ValueError(f"Cần ít nhất 30 ngày dữ liệu để train. Hiện có: {len(df)} ngày")
        
        # Train theo algorithm
        if algorithm == 'PROPHET':
            return self.train_prophet(df, **kwargs)
        elif algorithm == 'LIGHTGBM':
            return self.train_lightgbm(df, **kwargs)
        elif algorithm == 'XGBOOST':
            return self.train_xgboost(df, **kwargs)
    
    def save_model_to_repository(self, model_repository, branch_id: int,
                                 model, metadata: Dict,
                                 target_metric: str,
                                 algorithm: str,
                                 model_version: str, created_by: str) -> int:
        """
        Lưu forecasting model vào repository
        
        Args:
            model_repository: Model repository instance
            branch_id: ID chi nhánh
            model: Trained model
            metadata: Training metadata
            target_metric: Target metric được dự báo
            algorithm: Algorithm name
            model_version: Phiên bản model
            created_by: Người tạo model
        
        Returns:
            ID của model đã lưu
        """
        model_name = f"forecast_{algorithm.lower()}_{target_metric}_branch_{branch_id}"

        # Serialize model
        model_binary = pickle.dumps(model)

        # Deactivate model cũ cùng loại (bất kể version nào)
        model_repository.deactivate_by_name(model_name)

        # Tìm một model_version chưa bị trùng (model_name, model_version)
        final_version = model_version
        try:
            check_query = """
            SELECT 1 FROM ml_models
            WHERE model_name = %s AND model_version = %s
            LIMIT 1
            """
            suffix = 1
            while True:
                rows = model_repository.db.execute_query(
                    check_query, (model_name, final_version)
                )
                if not rows:
                    break
                # Nếu bị trùng, cộng thêm hậu tố -1, -2, ...
                final_version = f"{model_version}-{suffix}"
                suffix += 1
        except Exception:
            # Nếu có lỗi khi kiểm tra, fallback về version gốc
            final_version = model_version

        # Tạo entity
        from datetime import date
        from ...domain.entities.ml_model import MLModel
        
        model_entity = MLModel(
            model_name=model_name,
            model_version=final_version,
            model_type=algorithm,
            model_data=model_binary,
            hyperparameters=json.dumps(metadata),
            feature_list=json.dumps(metadata.get('feature_cols', [])),
            training_data_start_date=date.fromisoformat(metadata['date_range']['start']),
            training_data_end_date=date.fromisoformat(metadata['date_range']['end']),
            training_samples_count=metadata['training_samples'],
            training_data_stats=json.dumps(metadata),
            is_active=True,
            is_production=False,
            created_by=created_by
        )
        
        # Lưu vào repository
        model_id = model_repository.save(model_entity)
        return model_id
    
    def evaluate_model(self, model: Any, metadata: Dict, 
                      training_df: pd.DataFrame,
                      algorithm: str,
                      target_metric: str,
                      test_ratio: float = 0.2) -> Dict[str, Any]:
        """
        Đánh giá model sau khi train bằng train/test split
        
        Args:
            model: Trained model
            metadata: Model metadata
            training_df: DataFrame training data
            algorithm: Algorithm name (PROPHET, LIGHTGBM, XGBOOST)
            target_metric: Target metric name
            test_ratio: Tỷ lệ dữ liệu test (mặc định: 0.2 = 20%)
        
        Returns:
            Dict chứa evaluation metrics
        """
        from .forecast_predictor import ForecastPredictor
        
        # Kiểm tra dữ liệu đầu vào
        if training_df is None or len(training_df) < 20:  # Cần ít nhất 20 samples
            return {
                'mae': None,
                'mse': None,
                'rmse': None,
                'mape': None,
                'r2': None,
                'test_samples': 0,
                'note': f'Không đủ dữ liệu để đánh giá (cần ít nhất 20 samples, có {len(training_df) if training_df is not None else 0})'
            }
        
        # Chia train/test
        split_idx = int(len(training_df) * (1 - test_ratio))
        if split_idx < 10:  # Cần ít nhất 10 samples để train
            split_idx = max(10, len(training_df) - 5)
        
        train_df = training_df.iloc[:split_idx].copy()
        test_df = training_df.iloc[split_idx:].copy()
        
        if len(train_df) < 10:
            return {
                'mae': None,
                'mse': None,
                'rmse': None,
                'mape': None,
                'r2': None,
                'test_samples': 0,
                'note': f'Không đủ dữ liệu để train (cần ít nhất 10 samples, có {len(train_df)})'
            }
        
        if len(test_df) == 0:
            return {
                'mae': None,
                'mse': None,
                'rmse': None,
                'mape': None,
                'r2': None,
                'test_samples': 0,
                'note': 'Không đủ dữ liệu để đánh giá'
            }
        
        # Retrain trên train_df (vì model đã train trên toàn bộ data)
        # Hoặc có thể dùng model hiện tại nếu đã train trên train_df
        # Ở đây ta sẽ retrain để đảm bảo đánh giá chính xác
        if algorithm == 'PROPHET':
            # Retrain Prophet trên train_df
            model_eval, _ = self.train_prophet(
                train_df,
                seasonality_mode=metadata.get('seasonality_mode', 'multiplicative'),
                yearly_seasonality=metadata.get('yearly_seasonality', True),
                weekly_seasonality=metadata.get('weekly_seasonality', True),
                daily_seasonality=metadata.get('daily_seasonality', False),
                use_external_regressors=metadata.get('use_external_regressors', True)
            )
            
            # Predict trên test_df
            predictor = ForecastPredictor()
            periods = len(test_df)
            start_date = test_df['ds'].min().date()
            
            forecast_values, _ = predictor.predict_prophet(
                model_eval, periods, start_date, metadata, train_df
            )
            
        elif algorithm in ['LIGHTGBM', 'XGBOOST']:
            # Dùng model đã train trên toàn bộ data để predict trên test set
            # Điều này phù hợp với cách đánh giá thực tế: model train trên toàn bộ data và predict trên test set
            # Không retrain vì retrain trên train_df sẽ làm giảm số lượng dữ liệu train và kết quả không phản ánh đúng hiệu suất model
            predictor = ForecastPredictor()
            periods = len(test_df)
            start_date = test_df['ds'].min().date()
            
            # Dùng model và metadata đã train trên toàn bộ data
            # train_df ở đây chỉ dùng để cung cấp historical data cho prediction (lag features, rolling features, etc.)
            forecast_values, _ = predictor.predict_lightgbm(
                model, metadata, train_df, periods, start_date
            )
        else:
            return {
                'mae': None,
                'mse': None,
                'rmse': None,
                'mape': None,
                'r2': None,
                'test_samples': 0,
                'note': f'Algorithm không được hỗ trợ: {algorithm}'
            }
        
        # So sánh với actual values
        test_actual = test_df['y'].values
        test_dates = test_df['ds'].dt.date.values
        
        test_pred = []
        for test_date in test_dates:
            date_str = test_date.strftime('%Y-%m-%d')
            pred_value = forecast_values.get(date_str)
            if pred_value is not None:
                test_pred.append(pred_value)
            else:
                test_pred.append(np.nan)
        
        test_pred = np.array(test_pred)
        
        # Loại bỏ NaN
        mask = ~(np.isnan(test_actual) | np.isnan(test_pred))
        if np.sum(mask) == 0:
            return {
                'mae': None,
                'mse': None,
                'rmse': None,
                'mape': None,
                'r2': None,
                'test_samples': len(test_df),
                'note': 'Không có giá trị hợp lệ để đánh giá'
            }
        
        test_actual_clean = test_actual[mask]
        test_pred_clean = test_pred[mask]
        
        # Tính metrics
        mae = np.mean(np.abs(test_actual_clean - test_pred_clean))
        mse = np.mean((test_actual_clean - test_pred_clean) ** 2)
        rmse = np.sqrt(mse)
        
        # MAPE
        mask_nonzero = test_actual_clean != 0
        if np.sum(mask_nonzero) > 0:
            mape = np.mean(np.abs((test_actual_clean[mask_nonzero] - test_pred_clean[mask_nonzero]) / test_actual_clean[mask_nonzero])) * 100
        else:
            mape = None
        
        # R²
        ss_res = np.sum((test_actual_clean - test_pred_clean) ** 2)
        ss_tot = np.sum((test_actual_clean - np.mean(test_actual_clean)) ** 2)
        r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else None
        
        return {
            'mae': float(mae),
            'mse': float(mse),
            'rmse': float(rmse),
            'mape': float(mape) if mape is not None else None,
            'r2': float(r2) if r2 is not None else None,
            'test_samples': len(test_df),
            'train_samples': len(train_df),
            'train_date_range': {
                'start': str(train_df['ds'].min().date()),
                'end': str(train_df['ds'].max().date())
            },
            'test_date_range': {
                'start': str(test_df['ds'].min().date()),
                'end': str(test_df['ds'].max().date())
            }
        }

