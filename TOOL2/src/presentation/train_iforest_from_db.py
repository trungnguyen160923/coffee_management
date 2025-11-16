"""
Train Isolation Forest từ database (daily_branch_metrics) và đánh giá độ tin cậy.

Usage (PowerShell):
  python -m src.presentation.train_iforest_from_db ^
    --branch-id 1 ^
    --days 180 ^
    --n-estimators 200 ^
    --contamination 0.1 ^
    --model-version v1.0 ^
    --created-by "system" ^
    [--no-save]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.infrastructure.database.connection import DatabaseConnection
from src.infrastructure.ml.ml_trainer import MLTrainer
from src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
from src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Isolation Forest from database")
    parser.add_argument("--branch-id", dest="branch_id", type=int, required=True,
                       help="ID chi nhánh")
    parser.add_argument("--days", dest="days", type=int, default=180,
                       help="Số ngày dữ liệu để train (mặc định: 180)")
    parser.add_argument("--n-estimators", dest="n_estimators", type=int, default=200,
                       help="Số trees trong Isolation Forest (mặc định: 200)")
    parser.add_argument("--contamination", dest="contamination", type=float, default=0.1,
                       help="Tỷ lệ anomalies dự kiến (mặc định: 0.1)")
    parser.add_argument("--model-version", dest="model_version", default="v1.0",
                       help="Phiên bản model (mặc định: v1.0)")
    parser.add_argument("--created-by", dest="created_by", default="system",
                       help="Người tạo model (mặc định: system)")
    parser.add_argument("--no-save", dest="no_save", action="store_true",
                       help="Không lưu model vào database (chỉ train và hiển thị kết quả)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("="*80)
    print("🚀 TRAIN ISOLATION FOREST FROM DATABASE")
    print("="*80)
    print(f"Branch ID: {args.branch_id}")
    print(f"Days: {args.days}")
    print(f"Hyperparameters: n_estimators={args.n_estimators}, contamination={args.contamination}")
    print(f"Model Version: {args.model_version}")
    if args.no_save:
        print(f"⚠️  MODE: DRY RUN (không lưu vào database)")
    print()

    print("🔌 Kết nối database...")
    try:
        db = DatabaseConnection()
        db.connect()
        print("✅ Kết nối thành công")
    except Exception as e:
        print(f"❌ Lỗi kết nối database: {e}")
        sys.exit(1)

    try:
        metrics_repo = MetricsRepositoryImpl(db)
        ml_trainer = MLTrainer()

        # Lấy dữ liệu training
        print(f"\n📊 Đang lấy dữ liệu training...")
        metrics_list = metrics_repo.find_for_training(args.branch_id, args.days)
        
        if len(metrics_list) < 10:
            raise ValueError(f"Không đủ dữ liệu để train (cần ít nhất 10 samples, có {len(metrics_list)})")
        
        print(f"✅ Đã lấy {len(metrics_list)} samples")
        
        # Train model
        print(f"\n📊 Đang train model...")
        model, scaler, metadata = ml_trainer.train(
            metrics_list,
            n_estimators=args.n_estimators,
            contamination=args.contamination
        )
        
        # Lưu model vào DB (nếu không có --no-save)
        model_id = None
        if not args.no_save:
            model_repo = ModelRepositoryImpl(db)
            model_id = ml_trainer.save_model_to_repository(
                model_repo,
                args.branch_id,
                model,
                scaler,
                metadata,
                args.model_version,
                args.created_by
            )

        print("\n" + "="*80)
        print("✅ TRAIN THÀNH CÔNG")
        print("="*80)

        print(f"\n📊 THÔNG TIN TRAINING:")
        print(f"   Samples: {metadata['training_samples']}")
        print(f"   Date Range: {metadata['training_date_start']} → {metadata['training_date_end']}")
        print(f"   Features: {len(metadata['feature_stats'])} features")

        print(f"\n🔍 PHÁT HIỆN ANOMALIES:")
        print(f"   Anomalies detected: {metadata['anomalies_in_training']} ({metadata['anomaly_rate']*100:.2f}%)")
        print(f"   Normal samples: {metadata['normal_samples']} ({(1-metadata['anomaly_rate'])*100:.2f}%)")
        print(f"   Expected contamination: {metadata['expected_contamination']*100:.2f}%")

        print(f"\n📈 ANOMALY SCORES (tổng quát):")
        print(f"   Mean: {metadata['mean_anomaly_score']:.4f}")
        print(f"   Std:  {metadata['std_anomaly_score']:.4f}")
        print(f"   Min:  {metadata['min_anomaly_score']:.4f}")
        print(f"   Max:  {metadata['max_anomaly_score']:.4f}")
        print(f"   Median: {metadata['median_anomaly_score']:.4f}")
        print(f"   Q25: {metadata['q25_anomaly_score']:.4f} | Q75: {metadata['q75_anomaly_score']:.4f}")

        if metadata.get('normal_mean_score') is not None:
            print(f"\n✅ NORMAL SAMPLES:")
            print(f"   Mean score: {metadata['normal_mean_score']:.4f}")
            print(f"   Std score:  {metadata['normal_std_score']:.4f}")

        if metadata.get('anomaly_mean_score') is not None:
            print(f"\n⚠️  ANOMALY SAMPLES:")
            print(f"   Mean score: {metadata['anomaly_mean_score']:.4f}")
            print(f"   Std score:  {metadata['anomaly_std_score']:.4f}")
            print(f"   Min score:  {metadata['anomaly_min_score']:.4f}")
            print(f"   Max score:  {metadata['anomaly_max_score']:.4f}")

        print(f"\n⚙️  HYPERPARAMETERS:")
        print(f"   n_estimators: {metadata['n_estimators']}")
        print(f"   contamination: {metadata['contamination']}")
        
        if metadata.get('threshold_score') is not None:
            print(f"\n🎯 THRESHOLD (Contamination Rate Method):")
            print(f"   Threshold Score: {metadata['threshold_score']:.4f}")
            print(f"   Threshold Percentile: {100.0 * (1.0 - metadata['contamination']):.1f}th percentile")
            print(f"   ✅ Sử dụng phương pháp Contamination Rate (chính xác hơn IQR method)")

        if args.no_save:
            print(f"\n💾 MODEL (KHÔNG LƯU VÀO DATABASE):")
            print(f"   ⚠️  Model đã được train nhưng KHÔNG được lưu vào database")
            print(f"   Model Name: iforest_anomaly_branch_{args.branch_id}")
            print(f"   Model Version: {args.model_version}")
            print(f"   💡 Sử dụng --no-save để test model trước khi lưu")
        else:
            print(f"\n💾 MODEL ĐÃ ĐƯỢC LƯU:")
            print(f"   Model ID: {model_id}")
            print(f"   Model Name: iforest_anomaly_branch_{args.branch_id}")
            print(f"   Model Version: {args.model_version}")
            print(f"   Location: bảng ml_models (database: analytics_db)")
            print(f"   Status: is_active=TRUE, is_production=FALSE")

        print(f"\n🎯 ĐÁNH GIÁ CHẤT LƯỢNG MODEL:")
        score_separation = None
        if metadata.get('normal_mean_score') is not None and metadata.get('anomaly_mean_score') is not None:
            score_separation = abs(metadata['normal_mean_score'] - metadata['anomaly_mean_score'])
            print(f"   Score separation: {score_separation:.4f}")
            if score_separation > 0.1:
                print("   ✅ Tốt: Model phân biệt rõ ràng giữa normal và anomaly")
            elif score_separation > 0.05:
                print("   ⚠️  Trung bình: Model có khả năng phân biệt nhưng cần cải thiện")
            else:
                print("   ❌ Yếu: Model khó phân biệt giữa normal và anomaly")

        anomaly_rate_diff = abs(metadata['anomaly_rate'] - metadata['expected_contamination'])
        print(f"   Anomaly rate difference: {anomaly_rate_diff*100:.2f}%")
        if anomaly_rate_diff < 0.02:
            print("   ✅ Tốt: Tỷ lệ anomaly phát hiện gần với contamination rate")
        elif anomaly_rate_diff < 0.05:
            print("   ⚠️  Trung bình: Tỷ lệ anomaly có sự khác biệt nhỏ")
        else:
            print("   ⚠️  Chú ý: Tỷ lệ anomaly khác biệt đáng kể với contamination rate")

        print(f"\n📊 CLASSIFICATION METRICS:")
        if metadata.get('accuracy_score') is not None:
            print(f"   ⚠️  LƯU Ý: {metadata.get('note', '')}")
            print(f"   Accuracy:  {metadata['accuracy_score']:.4f}")
            print(f"   Precision: {metadata['precision_score']:.4f}")
            print(f"   Recall:    {metadata['recall_score']:.4f}")
            print(f"   F1 Score:  {metadata['f1_score']:.4f}")
            if metadata.get('confusion_matrix'):
                cm = metadata['confusion_matrix']
                print(f"\n   Confusion Matrix:")
                print("   ┌─────────────┬──────────────┐")
                print("   │             │  Predicted   │")
                print("   │             │ Normal│Anomaly│")
                print("   ├─────────────┼──────┼───────┤")
                print("   │ Actual      │      │       │")
                print(f"   │ Normal      │ {cm['true_negatives']:5d}│ {cm['false_positives']:5d}│")
                print(f"   │ Anomaly     │ {cm['false_negatives']:5d}│ {cm['true_positives']:5d}│")
                print("   └─────────────┴──────┴───────┘")
        else:
            print("   ⚠️  Không thể tính classification metrics (cần labeled data)")
            print("   → Isolation Forest là unsupervised, thiếu ground truth để so sánh")

        print("="*80)

    except Exception as e:
        print(f"\n❌ Lỗi khi train: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.disconnect()


if __name__ == "__main__":
    main()

