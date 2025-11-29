"""
Train Demand Forecasting Model từ database

Usage (PowerShell):
  python -m src.presentation.train_forecast_model_db ^
    --branch-id 10 ^
    --algorithm PROPHET ^
    --target-metric order_count ^
    [--training-days 90] ^
    [--model-version v1.0]
"""
import argparse

from ..infrastructure.database.connection import DatabaseConnection
from ..infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
from ..infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
from ..application.use_cases.train_forecast_model_use_case import TrainForecastModelUseCase


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train demand forecasting model from database")
    parser.add_argument("--branch-id", dest="branch_id", type=int, required=True)
    parser.add_argument("--algorithm", dest="algorithm", 
                       choices=['PROPHET', 'LIGHTGBM', 'XGBOOST'],
                       required=True,
                       help="Thuật toán: PROPHET, LIGHTGBM, hoặc XGBOOST")
    parser.add_argument("--target-metric", dest="target_metric",
                       choices=['order_count', 'total_revenue', 'customer_count', 'avg_order_value'],
                       required=True,
                       help="Metric cần dự báo")
    parser.add_argument("--training-days", dest="training_days", type=int, default=90,
                       help="Số ngày dữ liệu training (mặc định: 90)")
    parser.add_argument("--rolling-window", dest="rolling_window", type=int, default=None,
                       help="Số ngày rolling window (chỉ train trên N ngày cuối, mặc định: None = dùng toàn bộ)")
    parser.add_argument("--model-version", dest="model_version", default="v1.0",
                       help="Phiên bản model (mặc định: v1.0)")
    parser.add_argument("--created-by", dest="created_by", default="system",
                       help="Người tạo model (mặc định: system)")
    parser.add_argument("--no-save", dest="no_save", action="store_true",
                       help="Không lưu model vào database (chỉ train và hiển thị kết quả)")
    
    # Hyperparameters cho Prophet
    parser.add_argument("--prophet-seasonality-mode", dest="prophet_seasonality_mode",
                       choices=['additive', 'multiplicative'], default='multiplicative',
                       help="Prophet seasonality mode")
    parser.add_argument("--prophet-yearly-seasonality", dest="prophet_yearly_seasonality",
                       type=bool, default=True,
                       help="Prophet yearly seasonality")
    parser.add_argument("--prophet-weekly-seasonality", dest="prophet_weekly_seasonality",
                       type=bool, default=True,
                       help="Prophet weekly seasonality")
    parser.add_argument("--prophet-use-regressors", dest="prophet_use_regressors",
                       type=bool, default=True,
                       help="Prophet sử dụng external regressors (day_of_week, is_weekend, etc.)")
    
    # Hyperparameters cho LightGBM/XGBoost
    # Default values được optimize từ all_improvements (R²=0.5210)
    parser.add_argument("--n-estimators", dest="n_estimators", type=int, default=300,
                       help="Số trees (LightGBM/XGBoost, mặc định: 300 - optimized)")
    parser.add_argument("--learning-rate", dest="learning_rate", type=float, default=0.03,
                       help="Learning rate (LightGBM/XGBoost, mặc định: 0.03 - optimized)")
    parser.add_argument("--max-depth", dest="max_depth", type=int, default=6,
                       help="Max depth (LightGBM/XGBoost, mặc định: 6 - optimized)")
    parser.add_argument("--num-leaves", dest="num_leaves", type=int, default=100,
                       help="Số lá tối đa cho LightGBM (mặc định: 100 - optimized, nên <= 2^max_depth)")
    parser.add_argument("--min-child-samples", dest="min_child_samples", type=int, default=5,
                       help="Số samples tối thiểu trong leaf cho LightGBM (mặc định: 5 - optimized)")
    parser.add_argument("--subsample", dest="subsample", type=float, default=0.8,
                       help="Tỷ lệ subsample training data cho LightGBM (mặc định: 0.8)")
    parser.add_argument("--colsample-bytree", dest="colsample_bytree", type=float, default=0.8,
                       help="Tỷ lệ features dùng cho mỗi tree cho LightGBM (mặc định: 0.8)")
    parser.add_argument("--reg-alpha", dest="reg_alpha", type=float, default=0.05,
                       help="L1 regularization cho LightGBM (mặc định: 0.05 - optimized)")
    parser.add_argument("--reg-lambda", dest="reg_lambda", type=float, default=0.01,
                       help="L2 regularization cho LightGBM (mặc định: 0.01 - optimized)")
    
    # Options cho xử lý dữ liệu
    parser.add_argument("--remove-outliers", dest="remove_outliers", action="store_true",
                       help="Xử lý outliers (winsorize) trước khi train")
    parser.add_argument("--feature-selection", dest="feature_selection", action="store_true",
                       help="Loại bỏ features có correlation thấp với target")
    parser.add_argument("--min-correlation", dest="min_correlation", type=float, default=0.1,
                       help="Ngưỡng correlation tối thiểu để giữ feature (mặc định: 0.1)")
    
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    
    print("=" * 80)
    print(f"🚀 TRAIN DEMAND FORECASTING MODEL")
    print("=" * 80)
    print(f"Branch ID: {args.branch_id}")
    print(f"Algorithm: {args.algorithm}")
    print(f"Target Metric: {args.target_metric}")
    print(f"Training Days: {args.training_days}")
    if args.rolling_window:
        print(f"Rolling Window: {args.rolling_window} days (chỉ train trên {args.rolling_window} ngày cuối)")
    print(f"Model Version: {args.model_version}")
    if args.no_save:
        print(f"⚠️  MODE: DRY RUN (không lưu vào database)")
    print()
    
    # Kết nối database
    print("🔌 Kết nối database...")
    try:
        db = DatabaseConnection()
        db.connect()
        print("✅ Kết nối thành công")
    except Exception as e:
        print(f"❌ Lỗi kết nối database: {e}")
        sys.exit(1)
    
    try:
        # Khởi tạo repositories và use case
        metrics_repo = MetricsRepositoryImpl(db)
        model_repo = ModelRepositoryImpl(db)
        train_use_case = TrainForecastModelUseCase(metrics_repo, model_repo)
        
        # Chuẩn bị hyperparameters
        hyperparameters = {}
        if args.algorithm == 'PROPHET':
            hyperparameters = {
                'seasonality_mode': args.prophet_seasonality_mode,
                'yearly_seasonality': args.prophet_yearly_seasonality,
                'weekly_seasonality': args.prophet_weekly_seasonality,
                'daily_seasonality': False,
                'use_external_regressors': args.prophet_use_regressors
            }
        elif args.algorithm == 'LIGHTGBM':
            hyperparameters = {
                'n_estimators': args.n_estimators,
                'learning_rate': args.learning_rate,
                'max_depth': args.max_depth,
                'num_leaves': args.num_leaves,
                'min_child_samples': args.min_child_samples,
                'subsample': args.subsample,
                'colsample_bytree': args.colsample_bytree,
                'reg_alpha': args.reg_alpha,
                'reg_lambda': args.reg_lambda,
                'remove_outliers': args.remove_outliers,
                'feature_selection': args.feature_selection,
                'min_correlation': args.min_correlation
            }
        elif args.algorithm == 'XGBOOST':
            hyperparameters = {
                'n_estimators': args.n_estimators,
                'learning_rate': args.learning_rate,
                'max_depth': args.max_depth
            }
        
        # Train model
        print(f"\n📊 Đang train model...")
        result = train_use_case.execute(
            branch_id=args.branch_id,
            algorithm=args.algorithm,
            target_metric=args.target_metric,
            training_days=args.training_days,
            rolling_window=args.rolling_window,
            model_version=args.model_version,
            created_by=args.created_by,
            save_to_db=not args.no_save,
            **hyperparameters
        )
        
        print(f"\n✅ Train thành công!")
        if result.get('model_id'):
            print(f"   Model ID: {result['model_id']}")
        else:
            print(f"   ⚠️  Model không được lưu (--no-save mode)")
        print(f"   Algorithm: {result['algorithm']}")
        print(f"   Target Metric: {result['target_metric']}")
        print(f"   Training Samples: {result['training_samples']}")
        print(f"   Training Date Range: {result['metadata']['date_range']['start']} → {result['metadata']['date_range']['end']}")
        
        # Hiển thị kết quả đánh giá
        eval_metrics = result.get('evaluation_metrics')
        if eval_metrics:
            print(f"\n📊 ĐÁNH GIÁ MODEL (Train/Test Split):")
            print("-" * 80)
            if eval_metrics.get('note'):
                print(f"   ⚠️  {eval_metrics['note']}")
            else:
                print(f"   Train Set: {eval_metrics.get('train_samples', 0)} samples")
                print(f"              {eval_metrics.get('train_date_range', {}).get('start', 'N/A')} → {eval_metrics.get('train_date_range', {}).get('end', 'N/A')}")
                print(f"   Test Set:  {eval_metrics.get('test_samples', 0)} samples")
                print(f"              {eval_metrics.get('test_date_range', {}).get('start', 'N/A')} → {eval_metrics.get('test_date_range', {}).get('end', 'N/A')}")
                print()
                
                # Metrics
                if eval_metrics.get('mae') is not None:
                    print(f"   MAE:  {eval_metrics['mae']:,.2f}")
                if eval_metrics.get('rmse') is not None:
                    print(f"   RMSE: {eval_metrics['rmse']:,.2f}")
                if eval_metrics.get('mape') is not None:
                    mape = eval_metrics['mape']
                    mape_grade = "Xuất sắc" if mape < 5 else \
                               "Tốt" if mape < 10 else \
                               "Khá" if mape < 20 else \
                               "Kém" if mape < 30 else "Rất kém"
                    print(f"   MAPE: {mape:.2f}% - {mape_grade}")
                if eval_metrics.get('r2') is not None:
                    r2 = eval_metrics['r2']
                    r2_grade = "Rất tốt" if r2 > 0.9 else \
                              "Tốt" if r2 > 0.7 else \
                              "Khá" if r2 > 0.5 else \
                              "Kém" if r2 > 0 else "Rất kém"
                    print(f"   R²:   {r2:.4f} - {r2_grade}")
        elif result['metadata'].get('evaluation_error'):
            print(f"\n⚠️  Đánh giá model thất bại: {result['metadata']['evaluation_error']}")
        else:
            print(f"\n⚠️  Không thể đánh giá model (thiếu dữ liệu)")
        
        if args.no_save:
            print(f"\n💡 Sử dụng lại command không có --no-save để lưu model vào database")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.disconnect()


if __name__ == "__main__":
    main()

