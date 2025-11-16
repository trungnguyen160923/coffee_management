"""
Predict Demand Forecast từ database

Usage (PowerShell):
  python -m src.presentation.predict_forecast_db ^
    --branch-id 10 ^
    --algorithm PROPHET ^
    --target-metric order_count ^
    [--forecast-days 7] ^
    [--start-date 2025-11-09] ^
    [--model-id 2]
"""
import argparse
import sys
import json
from pathlib import Path
from datetime import date, datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.infrastructure.database.connection import DatabaseConnection
from src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
from src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
from src.infrastructure.repositories.forecast_repository_impl import ForecastRepositoryImpl
from src.application.use_cases.predict_forecast_use_case import PredictForecastUseCase
from src.presentation.evaluate_forecast_confidence import calculate_confidence_score


def create_forecast_json_output(
    branch_id: int,
    algorithm: str,
    target_metric: str,
    forecast_values: dict,
    confidence_intervals: dict,
    forecast_start_date: date,
    forecast_end_date: date,
    confidence_metrics: dict = None,
    summary_only: bool = False
) -> dict:
    """
    Tạo JSON output cho forecast prediction
    
    Args:
        branch_id: ID chi nhánh
        algorithm: Thuật toán (PROPHET, LIGHTGBM, XGBOOST)
        target_metric: Metric được dự báo
        forecast_values: Dict {date_str: forecast_value}
        confidence_intervals: Dict {date_str: {lower, upper}}
        forecast_start_date: Ngày bắt đầu dự báo
        forecast_end_date: Ngày kết thúc dự báo
        confidence_metrics: Metrics về độ tin cậy
        summary_only: Chỉ xuất thông tin quản lý cần
    
    Returns:
        Dict chứa JSON output
    """
    # Map metric names sang tiếng Việt
    metric_name_map = {
        'order_count': 'Số lượng đơn hàng',
        'total_revenue': 'Tổng doanh thu',
        'customer_count': 'Số lượng khách hàng',
        'avg_order_value': 'Giá trị đơn hàng trung bình'
    }
    
    metric_name = metric_name_map.get(target_metric, target_metric)
    
    if summary_only:
        # Version đơn giản - chỉ thông tin quản lý cần
        forecast_list = []
        for date_str in sorted(forecast_values.keys()):
            forecast_val = forecast_values[date_str]
            ci = confidence_intervals.get(date_str, {})
            lower = ci.get('lower', forecast_val * 0.9)  # Fallback nếu không có CI
            upper = ci.get('upper', forecast_val * 1.1)
            
            # Format giá trị
            if target_metric in ['order_count', 'customer_count']:
                forecast_val = int(round(forecast_val))
                lower = int(round(lower))
                upper = int(round(upper))
            else:
                forecast_val = round(forecast_val, 2)
                lower = round(lower, 2)
                upper = round(upper, 2)
            
            forecast_list.append({
                'ngay': date_str,
                'du_bao': forecast_val,
                'khoang_tin_cay': {
                    'min': lower,
                    'max': upper
                }
            })
        
        # Tính tóm tắt
        forecast_nums = [f['du_bao'] for f in forecast_list]
        avg_forecast = sum(forecast_nums) / len(forecast_nums) if forecast_nums else 0
        min_forecast = min(forecast_nums) if forecast_nums else 0
        max_forecast = max(forecast_nums) if forecast_nums else 0
        
        # Format tóm tắt
        if target_metric in ['order_count', 'customer_count']:
            avg_forecast = int(round(avg_forecast))
            min_forecast = int(round(min_forecast))
            max_forecast = int(round(max_forecast))
        else:
            avg_forecast = round(avg_forecast, 2)
            min_forecast = round(min_forecast, 2)
            max_forecast = round(max_forecast, 2)
        
        # Xử lý date - có thể là string hoặc date object
        start_date_str = forecast_start_date.isoformat() if isinstance(forecast_start_date, date) else str(forecast_start_date)
        end_date_str = forecast_end_date.isoformat() if isinstance(forecast_end_date, date) else str(forecast_end_date)
        
        output = {
            'chi_nhanh': branch_id,
            'chi_tieu': metric_name,
            'chi_tieu_code': target_metric,
            'tu_ngay': start_date_str,
            'den_ngay': end_date_str,
            'so_ngay_du_bao': len(forecast_list),
            'du_bao_theo_ngay': forecast_list,
            'tom_tat': {
                'trung_binh': avg_forecast,
                'thap_nhat': min_forecast,
                'cao_nhat': max_forecast
            }
        }
        
        # Thêm độ tin cậy đơn giản (nếu có)
        if confidence_metrics:
            confidence_percentage = calculate_confidence_percentage(confidence_metrics)
            if confidence_percentage >= 85:
                do_tin_cay = "RẤT CAO"
            elif confidence_percentage >= 70:
                do_tin_cay = "CAO"
            elif confidence_percentage >= 55:
                do_tin_cay = "TRUNG BÌNH"
            else:
                do_tin_cay = "THẤP"
            
            output['do_tin_cay'] = {
                'phan_tram': round(confidence_percentage, 1),
                'muc_do': do_tin_cay
            }
    else:
        # Version đầy đủ
        forecast_list = []
        for date_str in sorted(forecast_values.keys()):
            forecast_val = forecast_values[date_str]
            ci = confidence_intervals.get(date_str, {})
            forecast_list.append({
                'date': date_str,
                'forecast': float(forecast_val),
                'confidence_interval': {
                    'lower': float(ci.get('lower', 0)),
                    'upper': float(ci.get('upper', 0))
                }
            })
        
        # Xử lý date - có thể là string hoặc date object
        start_date_str = forecast_start_date.isoformat() if isinstance(forecast_start_date, date) else str(forecast_start_date)
        end_date_str = forecast_end_date.isoformat() if isinstance(forecast_end_date, date) else str(forecast_end_date)
        
        output = {
            'branch_id': branch_id,
            'algorithm': algorithm,
            'target_metric': target_metric,
            'forecast_start_date': start_date_str,
            'forecast_end_date': end_date_str,
            'forecast_days': len(forecast_list),
            'forecast_values': forecast_list,
            'summary': {
                'average': float(sum(f['forecast'] for f in forecast_list) / len(forecast_list) if forecast_list else 0),
                'min': float(min(f['forecast'] for f in forecast_list) if forecast_list else 0),
                'max': float(max(f['forecast'] for f in forecast_list) if forecast_list else 0)
            },
            'confidence_metrics': confidence_metrics if confidence_metrics else None
        }
    
    return output


def calculate_confidence_percentage(confidence_metrics: dict) -> float:
    """
    Tính toán phần trăm độ tin cậy dựa trên các metrics
    
    Args:
        confidence_metrics: Dict chứa các metrics từ calculate_confidence_score
    
    Returns:
        Phần trăm độ tin cậy (0-100)
    """
    if not confidence_metrics:
        return 0.0
    
    ci_percentage = confidence_metrics.get('avg_ci_percentage', 100)
    cv = confidence_metrics.get('coefficient_of_variation', 100)
    
    # Tính điểm dựa trên CI percentage (càng nhỏ càng tốt)
    # CI < 5%: 100 điểm, CI < 10%: 80 điểm, CI < 20%: 60 điểm, CI >= 20%: 40 điểm
    if ci_percentage < 5:
        ci_score = 100
    elif ci_percentage < 10:
        ci_score = 80
    elif ci_percentage < 20:
        ci_score = 60
    else:
        ci_score = 40
    
    # Tính điểm dựa trên coefficient of variation (càng nhỏ càng tốt)
    # CV < 2%: 100 điểm, CV < 5%: 80 điểm, CV < 10%: 60 điểm, CV >= 10%: 40 điểm
    if cv < 2:
        cv_score = 100
    elif cv < 5:
        cv_score = 80
    elif cv < 10:
        cv_score = 60
    else:
        cv_score = 40
    
    # Trọng số: CI quan trọng hơn (60%), CV ít quan trọng hơn (40%)
    confidence_percentage = (ci_score * 0.6) + (cv_score * 0.4)
    
    return round(confidence_percentage, 1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Predict demand forecast from database")
    parser.add_argument("--branch-id", dest="branch_id", type=int, required=True)
    parser.add_argument("--algorithm", dest="algorithm",
                       choices=['PROPHET', 'LIGHTGBM', 'XGBOOST'],
                       required=True,
                       help="Thuật toán: PROPHET, LIGHTGBM, hoặc XGBOOST")
    parser.add_argument("--target-metric", dest="target_metric",
                       choices=['order_count', 'total_revenue', 'customer_count', 'avg_order_value'],
                       required=True,
                       help="Metric cần dự báo")
    parser.add_argument("--forecast-days", dest="forecast_days", type=int, default=7,
                       help="Số ngày cần dự báo (mặc định: 7)")
    parser.add_argument("--start-date", dest="start_date", default=None,
                       help="Ngày bắt đầu dự báo (YYYY-MM-DD, mặc định: ngày mai)")
    parser.add_argument("--model-id", dest="model_id", type=int, default=None,
                       help="ID model cụ thể (nếu không có thì dùng active model)")
    parser.add_argument("--no-save", dest="no_save", action="store_true",
                       help="Không lưu kết quả vào database")
    parser.add_argument("--output-json", dest="output_json", type=str, default=None,
                       help="Đường dẫn file JSON để lưu kết quả (nếu confidence >= threshold)")
    parser.add_argument("--confidence-threshold", dest="confidence_threshold", type=float, default=0.6,
                       help="Ngưỡng confidence tối thiểu để xuất JSON (0.0-1.0, mặc định: 0.6)")
    parser.add_argument("--always-output-json", dest="always_output_json", action="store_true",
                       help="Luôn xuất JSON bất kể confidence level")
    parser.add_argument("--summary-only", dest="summary_only", action="store_true",
                       help="Chỉ xuất thông tin quan trọng cho báo cáo (bỏ thông tin kỹ thuật)")
    
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    
    # Parse start_date
    start_date = None
    if args.start_date:
        try:
            start_date = date.fromisoformat(args.start_date)
        except ValueError:
            print(f"❌ Invalid --start-date format; use YYYY-MM-DD")
            sys.exit(1)
    
    print("=" * 80)
    print(f"🔮 PREDICT DEMAND FORECAST")
    print("=" * 80)
    print(f"Branch ID: {args.branch_id}")
    print(f"Algorithm: {args.algorithm}")
    print(f"Target Metric: {args.target_metric}")
    print(f"Forecast Days: {args.forecast_days}")
    if start_date:
        print(f"Start Date: {start_date}")
    if args.model_id:
        print(f"Model ID: {args.model_id}")
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
        forecast_repo = ForecastRepositoryImpl(db)
        predict_use_case = PredictForecastUseCase(metrics_repo, model_repo, forecast_repo)
        
        # Predict
        print(f"\n🔮 Đang predict...")
        result = predict_use_case.execute(
            branch_id=args.branch_id,
            algorithm=args.algorithm,
            target_metric=args.target_metric,
            forecast_horizon_days=args.forecast_days,
            start_date=start_date,
            model_id=args.model_id,
            save_result=not args.no_save
        )
        
        print(f"\n✅ Predict thành công!")
        print(f"   Forecast ID: {result.get('forecast_id', 'N/A (not saved)')}")
        print(f"   Forecast Period: {result['forecast_start_date']} → {result['forecast_end_date']}")
        print()
        
        # Hiển thị kết quả dự báo
        print("📊 FORECAST RESULTS:")
        print("=" * 80)
        print(f"{'Date':<15} {'Forecast':<15} {'Lower CI':<15} {'Upper CI':<15}")
        print("-" * 80)
        
        forecast_values = result['forecast_values']
        confidence_intervals = result['confidence_intervals']
        
        for date_str in sorted(forecast_values.keys()):
            forecast_val = forecast_values[date_str]
            ci = confidence_intervals.get(date_str, {})
            lower = ci.get('lower', 0)
            upper = ci.get('upper', 0)
            
            print(f"{date_str:<15} {forecast_val:<15.2f} {lower:<15.2f} {upper:<15.2f}")
        
        print("=" * 80)
        
        # Tóm tắt
        import statistics
        forecast_list = list(forecast_values.values())
        print(f"\n📈 SUMMARY:")
        print(f"   Average Forecast: {statistics.mean(forecast_list):.2f}")
        print(f"   Min Forecast: {min(forecast_list):.2f}")
        print(f"   Max Forecast: {max(forecast_list):.2f}")
        
        # Tính toán và hiển thị độ tin cậy
        print(f"\n🎯 ĐỘ TIN CẬY FORECAST:")
        print("-" * 80)
        confidence_metrics = calculate_confidence_score(forecast_values, confidence_intervals)
        
        if confidence_metrics:
            ci_percentage = confidence_metrics['avg_ci_percentage']
            cv = confidence_metrics['coefficient_of_variation']
            confidence_percentage = calculate_confidence_percentage(confidence_metrics)
            
            # Xác định mức độ tin cậy
            if confidence_percentage >= 85:
                confidence_level = "RẤT CAO"
                confidence_emoji = "🟢"
            elif confidence_percentage >= 70:
                confidence_level = "CAO"
                confidence_emoji = "🟡"
            elif confidence_percentage >= 55:
                confidence_level = "TRUNG BÌNH"
                confidence_emoji = "🟠"
            else:
                confidence_level = "THẤP"
                confidence_emoji = "🔴"
            
            print(f"   {confidence_emoji} Độ tin cậy: {confidence_percentage}% ({confidence_level})")
            print(f"   → CI trung bình: {ci_percentage:.2f}% (±{ci_percentage/2:.2f}%)")
            print(f"   → Hệ số biến thiên: {cv:.2f}%")
            
            # Thông tin thêm về model (nếu có)
            if result.get('model_id'):
                model = model_repo.find_by_id(result['model_id'])
                if model:
                    print(f"\n   📊 Model Info:")
                    print(f"      Model ID: {model.id}")
                    print(f"      Training Samples: {model.training_samples_count or 'N/A'}")
                    if model.training_data_start_date and model.training_data_end_date:
                        print(f"      Training Period: {model.training_data_start_date} → {model.training_data_end_date}")
        else:
            print("   ⚠️  Không thể tính toán độ tin cậy (thiếu confidence intervals)")
        
        print("\n" + "=" * 80)
        
        # Tính confidence percentage để kiểm tra threshold
        confidence_percentage = 0.0
        if 'confidence_metrics' in locals() and confidence_metrics:
            confidence_percentage = calculate_confidence_percentage(confidence_metrics) / 100.0  # Convert sang 0-1
        elif confidence_intervals:
            # Nếu không có confidence_metrics nhưng có confidence_intervals, ước tính confidence
            # Dựa trên độ rộng của confidence intervals
            ci_widths = []
            for date_str in forecast_values.keys():
                ci = confidence_intervals.get(date_str, {})
                if ci.get('lower') and ci.get('upper'):
                    forecast_val = forecast_values[date_str]
                    if forecast_val > 0:
                        ci_width = (ci['upper'] - ci['lower']) / forecast_val
                        ci_widths.append(ci_width)
            
            if ci_widths:
                avg_ci_width = sum(ci_widths) / len(ci_widths)
                # CI width càng nhỏ → confidence càng cao
                # CI < 0.1 (10%): confidence = 0.9
                # CI < 0.2 (20%): confidence = 0.7
                # CI >= 0.2: confidence = 0.5
                if avg_ci_width < 0.1:
                    confidence_percentage = 0.9
                elif avg_ci_width < 0.2:
                    confidence_percentage = 0.7
                else:
                    confidence_percentage = 0.5
        
        # Xuất JSON nếu được yêu cầu và confidence đạt threshold
        should_output_json = args.always_output_json or (
            args.output_json and confidence_percentage >= args.confidence_threshold
        )
        
        if should_output_json and args.output_json:
            print(f"\n📄 Đang tạo JSON output...")
            try:
                json_output = create_forecast_json_output(
                    branch_id=args.branch_id,
                    algorithm=args.algorithm,
                    target_metric=args.target_metric,
                    forecast_values=forecast_values,
                    confidence_intervals=confidence_intervals,
                    forecast_start_date=result['forecast_start_date'],
                    forecast_end_date=result['forecast_end_date'],
                    confidence_metrics=confidence_metrics if 'confidence_metrics' in locals() else None,
                    summary_only=args.summary_only
                )
                
                # Lưu vào file
                output_path = Path(args.output_json)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(json_output, f, indent=2, ensure_ascii=False)
                
                print(f"✅ Đã lưu JSON output: {output_path}")
                print(f"   Confidence: {confidence_percentage:.4f} ({confidence_percentage*100:.1f}%)")
                if confidence_percentage < args.confidence_threshold:
                    print(f"   ⚠️  Lưu ý: Confidence ({confidence_percentage:.4f}) thấp hơn threshold ({args.confidence_threshold})")
                if args.summary_only:
                    if 'so_ngay_du_bao' in json_output:
                        print(f"   Số ngày dự báo: {json_output['so_ngay_du_bao']}")
                    if 'do_tin_cay' in json_output:
                        print(f"   Độ tin cậy: {json_output['do_tin_cay']['phan_tram']}% ({json_output['do_tin_cay']['muc_do']})")
                else:
                    if 'forecast_days' in json_output:
                        print(f"   Forecast days: {json_output['forecast_days']}")
                    if 'confidence_metrics' in json_output and json_output['confidence_metrics']:
                        conf_pct = calculate_confidence_percentage(json_output['confidence_metrics'])
                        print(f"   Confidence: {conf_pct}%")
                
            except Exception as json_exc:
                print(f"⚠️  Lỗi khi tạo JSON output: {json_exc}")
                import traceback
                traceback.print_exc()
        elif args.output_json and confidence_percentage < args.confidence_threshold:
            print(f"\n⚠️  Không xuất JSON vì confidence ({confidence_percentage:.4f}) thấp hơn threshold ({args.confidence_threshold})")
            print(f"   Sử dụng --always-output-json để luôn xuất JSON")
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.disconnect()


if __name__ == "__main__":
    main()

