"""
Đánh giá độ tin cậy của forecast dựa trên confidence intervals và historical performance
"""

import sys
from pathlib import Path
from datetime import date, datetime
from typing import Dict, List
import json

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.infrastructure.database.connection import DatabaseConnection
from src.infrastructure.repositories.forecast_repository_impl import ForecastRepositoryImpl
from src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl


def calculate_confidence_score(forecast_values: Dict[str, float],
                               confidence_intervals: Dict[str, Dict[str, float]]) -> Dict:
    """
    Tính toán các chỉ số độ tin cậy của forecast
    
    Args:
        forecast_values: Dict {date: forecast_value}
        confidence_intervals: Dict {date: {lower: x, upper: y}}
    
    Returns:
        Dict chứa các metrics về độ tin cậy
    """
    if not forecast_values or not confidence_intervals:
        return {}
    
    forecasts = list(forecast_values.values())
    ci_widths = []
    ci_percentages = []
    
    for date_str, forecast_val in forecast_values.items():
        ci = confidence_intervals.get(date_str, {})
        lower = ci.get('lower', 0)
        upper = ci.get('upper', 0)
        
        if forecast_val > 0:
            ci_width = upper - lower
            ci_widths.append(ci_width)
            ci_percentage = (ci_width / forecast_val) * 100
            ci_percentages.append(ci_percentage)
    
    avg_forecast = sum(forecasts) / len(forecasts) if forecasts else 0
    avg_ci_width = sum(ci_widths) / len(ci_widths) if ci_widths else 0
    avg_ci_percentage = sum(ci_percentages) / len(ci_percentages) if ci_percentages else 0
    
    # Độ biến thiên của forecast
    forecast_std = 0
    if len(forecasts) > 1:
        mean = avg_forecast
        variance = sum((x - mean) ** 2 for x in forecasts) / len(forecasts)
        forecast_std = variance ** 0.5
    
    coefficient_of_variation = (forecast_std / avg_forecast * 100) if avg_forecast > 0 else 0
    
    return {
        'avg_forecast': avg_forecast,
        'forecast_range': (min(forecasts), max(forecasts)),
        'forecast_std': forecast_std,
        'coefficient_of_variation': coefficient_of_variation,
        'avg_ci_width': avg_ci_width,
        'avg_ci_percentage': avg_ci_percentage,
        'min_ci_width': min(ci_widths) if ci_widths else 0,
        'max_ci_width': max(ci_widths) if ci_widths else 0
    }


def evaluate_forecast_confidence(forecast_id: int) -> None:
    """
    Đánh giá độ tin cậy của một forecast cụ thể
    """
    db = DatabaseConnection()
    
    try:
        db.connect()
        print("🔌 Kết nối database thành công\n")
        
        # Lấy forecast từ DB
        forecast_repo = ForecastRepositoryImpl(db)
        forecast = forecast_repo.find_by_id(forecast_id)
        
        if not forecast:
            print(f"❌ Không tìm thấy forecast với ID: {forecast_id}")
            return
        
        print("=" * 80)
        print("📊 ĐÁNH GIÁ ĐỘ TIN CẬY CỦA FORECAST")
        print("=" * 80)
        print(f"Forecast ID: {forecast_id}")
        print(f"Branch ID: {forecast.branch_id}")
        print(f"Algorithm: {forecast.algorithm}")
        print(f"Target Metric: {forecast.target_metric}")
        print(f"Forecast Period: {forecast.forecast_start_date} → {forecast.forecast_end_date}")
        print()
        
        # Parse forecast values và confidence intervals
        forecast_values = json.loads(forecast.forecast_values) if forecast.forecast_values else {}
        confidence_intervals = json.loads(forecast.confidence_intervals) if forecast.confidence_intervals else {}
        
        # Tính toán confidence metrics
        confidence_metrics = calculate_confidence_score(forecast_values, confidence_intervals)
        
        print("📈 THỐNG KÊ FORECAST:")
        print("-" * 80)
        print(f"  Giá trị dự báo trung bình: {confidence_metrics['avg_forecast']:.2f}")
        print(f"  Khoảng dự báo: {confidence_metrics['forecast_range'][0]:.2f} → {confidence_metrics['forecast_range'][1]:.2f}")
        print(f"  Độ lệch chuẩn: {confidence_metrics['forecast_std']:.2f}")
        print(f"  Hệ số biến thiên (CV): {confidence_metrics['coefficient_of_variation']:.2f}%")
        print()
        
        print("📊 CONFIDENCE INTERVALS:")
        print("-" * 80)
        print(f"  Độ rộng CI trung bình: {confidence_metrics['avg_ci_width']:.2f}")
        print(f"  CI trung bình (% của forecast): {confidence_metrics['avg_ci_percentage']:.2f}%")
        print(f"  CI nhỏ nhất: {confidence_metrics['min_ci_width']:.2f}")
        print(f"  CI lớn nhất: {confidence_metrics['max_ci_width']:.2f}")
        print()
        
        # Đánh giá dựa trên historical performance (nếu có)
        if forecast.model_id:
            model_repo = ModelRepositoryImpl(db)
            model = model_repo.find_by_id(forecast.model_id)
            
            if model:
                print("🎯 HISTORICAL MODEL PERFORMANCE:")
                print("-" * 80)
                print(f"  Model ID: {model.id}")
                print(f"  Model Version: {model.model_version}")
                print(f"  Training Samples: {model.training_samples_count or 'N/A'}")
                if model.training_data_start_date and model.training_data_end_date:
                    print(f"  Training Period: {model.training_data_start_date} → {model.training_data_end_date}")
                print()
        
        # Đánh giá tổng thể
        print("✅ ĐÁNH GIÁ TỔNG THỂ:")
        print("-" * 80)
        
        # Đánh giá dựa trên CI percentage
        ci_percentage = confidence_metrics['avg_ci_percentage']
        if ci_percentage < 5:
            ci_rating = "RẤT TỐT"
            ci_desc = "Khoảng tin cậy rất hẹp, độ chính xác cao"
        elif ci_percentage < 10:
            ci_rating = "TỐT"
            ci_desc = "Khoảng tin cậy hợp lý, độ chính xác tốt"
        elif ci_percentage < 20:
            ci_rating = "TRUNG BÌNH"
            ci_desc = "Khoảng tin cậy rộng, độ chính xác trung bình"
        else:
            ci_rating = "THẤP"
            ci_desc = "Khoảng tin cậy rất rộng, độ chính xác thấp"
        
        print(f"  Độ tin cậy CI: {ci_rating}")
        print(f"    → {ci_desc}")
        print(f"    → CI trung bình: ±{ci_percentage/2:.2f}% so với forecast")
        print()
        
        # Đánh giá dựa trên độ biến thiên
        cv = confidence_metrics['coefficient_of_variation']
        if cv < 2:
            cv_rating = "RẤT ỔN ĐỊNH"
            cv_desc = "Forecast rất ổn định, ít biến động"
        elif cv < 5:
            cv_rating = "ỔN ĐỊNH"
            cv_desc = "Forecast ổn định, biến động nhỏ"
        elif cv < 10:
            cv_rating = "TRUNG BÌNH"
            cv_desc = "Forecast có biến động vừa phải"
        else:
            cv_rating = "KHÔNG ỔN ĐỊNH"
            cv_desc = "Forecast có biến động lớn"
        
        print(f"  Độ ổn định: {cv_rating}")
        print(f"    → {cv_desc}")
        print(f"    → Hệ số biến thiên: {cv:.2f}%")
        print()
        
        # So sánh với historical metrics (nếu có từ evaluation trước)
        print("📋 KHUYẾN NGHỊ:")
        print("-" * 80)
        
        recommendations = []
        
        if ci_percentage > 15:
            recommendations.append("⚠️  Khoảng tin cậy rộng → Cân nhắc retrain model với nhiều dữ liệu hơn")
        
        if cv > 10:
            recommendations.append("⚠️  Forecast biến động lớn → Kiểm tra seasonality và external regressors")
        
        if confidence_metrics['avg_forecast'] < 50:
            recommendations.append("ℹ️  Giá trị dự báo thấp → Kiểm tra xem có phù hợp với business context không")
        
        if not recommendations:
            recommendations.append("✅ Forecast có vẻ đáng tin cậy dựa trên các metrics hiện tại")
        
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")
        
        print()
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.disconnect()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Đánh giá độ tin cậy của forecast")
    parser.add_argument("--forecast-id", dest="forecast_id", type=int, required=True,
                       help="ID của forecast cần đánh giá")
    
    args = parser.parse_args()
    evaluate_forecast_confidence(args.forecast_id)


if __name__ == "__main__":
    main()

