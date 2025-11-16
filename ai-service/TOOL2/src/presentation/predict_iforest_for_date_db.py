"""
Predict anomaly for a specific report_date using a trained Isolation Forest model from database.
Also compares with historical same-weekday data (D-7, D-14, D-21, D-28).

Usage (PowerShell):
  python -m src.presentation.predict_iforest_for_date_db ^
    --date 2025-11-08 ^
    --branch-id 10 ^
    [--model-id 2]  # Optional: specify model ID (ưu tiên cao nhất)
    [--model-version v1.0]  # Optional: specify model version (nếu không có model-id)
    [--compare-method both]  # weekday, rolling_7, rolling_30, both
    [--summary-only]  # Chỉ xuất thông tin quản lý cần (bỏ thông tin kỹ thuật)
    
Note: JSON output sẽ được in ra console, không lưu file và không tạo biểu đồ.

Ưu tiên load model:
  1. --model-id (nếu có)
  2. --model-version (nếu có)
  3. Active model (mặc định)
"""
import argparse
import sys
import json
from pathlib import Path
from datetime import date, timedelta, datetime
from typing import List, Optional, Tuple

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import warnings

# Tắt warning về missing glyphs (font không hỗ trợ một số ký tự)
warnings.filterwarnings('ignore', category=UserWarning, module='matplotlib')

# Set font hỗ trợ Unicode
# Thử các font hỗ trợ Unicode tốt
try:
    # Tìm font hỗ trợ Unicode (Arial, Tahoma, hoặc font hệ thống)
    available_fonts = [f.name for f in fm.fontManager.ttflist]
    unicode_fonts = ['Arial', 'Tahoma', 'DejaVu Sans', 'Liberation Sans', 'sans-serif']
    for font_name in unicode_fonts:
        if font_name in available_fonts:
            plt.rcParams['font.family'] = font_name
            break
    else:
        plt.rcParams['font.family'] = 'sans-serif'
except Exception:
    plt.rcParams['font.family'] = 'sans-serif'

plt.rcParams['axes.unicode_minus'] = False

from src.infrastructure.database.connection import DatabaseConnection
from src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
from src.infrastructure.repositories.model_repository_impl import ModelRepositoryImpl
from src.infrastructure.ml.ml_predictor import MLPredictor
from src.infrastructure.ml.weekday_comparator_db import WeekdayComparatorDB
from src.domain.entities.metrics import DailyBranchMetrics


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Predict anomaly for one date using database")
    parser.add_argument("--date", dest="report_date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--branch-id", dest="branch_id", type=int, required=True)
    parser.add_argument("--model-id", dest="model_id", type=int, default=None,
                       help="ID model cụ thể (ưu tiên cao nhất)")
    parser.add_argument("--model-version", dest="model_version", type=str, default=None,
                       help="Version model (ví dụ: v1.0, v2.0). Nếu không có model-id thì dùng version này")
    parser.add_argument("--compare-method", dest="compare_method", 
                       choices=['weekday', 'rolling_7', 'rolling_30', 'both'],
                       default='both',
                       help="Phương pháp so sánh: weekday (cùng thứ), rolling_7 (7 ngày), rolling_30 (30 ngày), both (tất cả)")
    # Các argument cũ (giữ lại để tương thích ngược, nhưng không sử dụng)
    parser.add_argument("--output-dir", dest="output_dir", type=str, default="./output",
                       help="[DEPRECATED] Không còn sử dụng - JSON sẽ được in ra console")
    parser.add_argument("--no-plot", dest="no_plot", action="store_true",
                       help="[DEPRECATED] Không còn vẽ biểu đồ")
    parser.add_argument("--history-days", dest="history_days", type=int, default=60,
                       help="[DEPRECATED] Không còn sử dụng")
    parser.add_argument("--output-json", dest="output_json", type=str, default=None,
                       help="[DEPRECATED] Không còn lưu file - JSON sẽ được in ra console")
    parser.add_argument("--confidence-threshold", dest="confidence_threshold", type=float, default=0.6,
                       help="[DEPRECATED] Không còn sử dụng - JSON luôn được in ra")
    parser.add_argument("--always-output-json", dest="always_output_json", action="store_true",
                       help="[DEPRECATED] Không còn sử dụng - JSON luôn được in ra")
    parser.add_argument("--summary-only", dest="summary_only", action="store_true",
                       help="Chỉ xuất thông tin quan trọng cho báo cáo (bỏ statistics chi tiết)")
    return parser.parse_args()


def _make_json_serializable(obj):
    """
    Convert object to JSON-serializable format
    Handles numpy types, bool, None, etc.
    """
    import numpy as np
    
    if obj is None:
        return None
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_make_json_serializable(item) for item in obj]
    elif isinstance(obj, (str, int, float)):
        return obj
    else:
        # Try to convert to string as fallback
        return str(obj)


def create_anomaly_json_output(
    report_date: date,
    branch_id: int,
    is_anomaly_iforest: bool,
    anomaly_score: float,
    confidence: float,
    weekday_result: dict,
    metric: DailyBranchMetrics,
    model_entity,
    score_stats: dict = None,
    summary_only: bool = False
) -> dict:
    """
    Tạo JSON output với đầy đủ thông tin về anomaly detection
    
    Args:
        report_date: Ngày dự đoán
        branch_id: ID chi nhánh
        is_anomaly_iforest: Kết quả từ Isolation Forest
        anomaly_score: Anomaly score (0-1)
        confidence: Confidence level (0-1)
        weekday_result: Kết quả từ Historical Comparison
        metric: DailyBranchMetrics entity
        model_entity: MLModel entity
        score_stats: Score statistics từ training
    
    Returns:
        Dict chứa JSON output
    """
    # Lấy feature values
    metric_dict = metric.to_dict()
    feature_list = []
    if model_entity.feature_list:
        try:
            feature_list = json.loads(model_entity.feature_list)
        except:
            feature_list = WeekdayComparatorDB.NUMERIC_FEATURES
    
    # Lấy feature values và convert sang JSON-serializable
    feature_values = {}
    for k in feature_list:
        if k in metric_dict:
            v = metric_dict.get(k)
            # Convert các giá trị đặc biệt
            if v is None:
                feature_values[k] = None
            elif isinstance(v, bool):
                feature_values[k] = bool(v)
            elif isinstance(v, (int, float)):
                feature_values[k] = float(v) if isinstance(v, float) else int(v)
            else:
                # Thử convert sang float/int nếu có thể
                try:
                    if isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit():
                        feature_values[k] = float(v)
                    else:
                        feature_values[k] = v
                except:
                    feature_values[k] = str(v)
    
    # Chuẩn bị thông tin về features bất thường
    anomalous_features = []
    if weekday_result.get('anomalies'):
        for anomaly in weekday_result['anomalies']:
            anomalous_features.append({
                'feature_name': anomaly['feature'],
                'current_value': float(anomaly['target_value']),
                'historical_mean': float(anomaly['historical_mean']),
                'deviation_percent': float(anomaly['deviation_pct']),
                'z_score': float(anomaly['z_score']),
                'is_below_p5': bool(anomaly.get('is_below_p5', False)),
                'is_above_p95': bool(anomaly.get('is_above_p95', False)),
                'reasons': anomaly.get('reasons', []),
                'detected_by': anomaly.get('detected_by', 'historical_comparison')
            })
    
    # Thông tin model
    model_info = {
        'model_id': model_entity.id,
        'model_name': model_entity.model_name,
        'model_version': model_entity.model_version,
        'model_type': model_entity.model_type
    }
    
    # Thông tin historical comparison
    historical_info = {
        'is_anomaly': bool(weekday_result.get('is_anomaly', False)),
        'method_used': str(weekday_result.get('method_used', 'unknown')),
        'historical_samples': int(weekday_result.get('historical_samples', 0)),
        'anomaly_count': int(len(weekday_result.get('anomalies', [])))
    }
    
    # Thông tin statistics (nếu có)
    statistics_info = {}
    if weekday_result.get('statistics'):
        for feat, stats in weekday_result['statistics'].items():
            statistics_info[feat] = {
                'current_value': float(stats.get('target_value', 0)),
                'historical_mean': float(stats.get('historical_mean', 0)),
                'historical_std': float(stats.get('historical_std', 0)),
                'historical_min': float(stats.get('historical_min', 0)),
                'historical_max': float(stats.get('historical_max', 0)),
                'historical_p5': float(stats.get('historical_p5', 0)),
                'historical_p95': float(stats.get('historical_p95', 0)),
                'z_score': float(stats.get('z_score', 0)),
                'samples': int(stats.get('historical_samples', 0))
            }
    
    # Comparison summary (nếu có) - convert tất cả giá trị sang float
    comparison_summary = {}
    if weekday_result.get('comparison_summary'):
        for feat, comp in weekday_result['comparison_summary'].items():
            comparison_summary[feat] = {
                'today': float(comp.get('today', 0)) if comp.get('today') is not None else None
            }
            if comp.get('vs_1_week'):
                comparison_summary[feat]['vs_1_week'] = {
                    'mean': float(comp['vs_1_week'].get('mean', 0)),
                    'deviation_pct': float(comp['vs_1_week'].get('deviation_pct', 0)),
                    'trend': comp['vs_1_week'].get('trend', 'N/A')
                }
            if comp.get('vs_1_month'):
                comparison_summary[feat]['vs_1_month'] = {
                    'mean': float(comp['vs_1_month'].get('mean', 0)),
                    'deviation_pct': float(comp['vs_1_month'].get('deviation_pct', 0)),
                    'trend': comp['vs_1_month'].get('trend', 'N/A')
                }
    
    # Individual method results (nếu có)
    individual_results = {}
    if weekday_result.get('individual_results'):
        for method, result in weekday_result['individual_results'].items():
            individual_results[method] = {
                'is_anomaly': bool(result.get('is_anomaly', False)),
                'anomaly_count': int(result.get('anomaly_count', 0)),
                'samples': int(result.get('samples', 0))
            }
    
    # Tạo JSON output
    if summary_only:
        # Version đơn giản - chỉ thông tin mà người quản lý cần
        # Không có thông tin kỹ thuật về thuật toán, model, confidence, etc.
        
        # Map feature names sang tên dễ hiểu
        feature_name_map = {
            'total_revenue': 'Tổng doanh thu',
            'order_count': 'Số lượng đơn hàng',
            'avg_order_value': 'Giá trị đơn hàng trung bình',
            'customer_count': 'Số lượng khách hàng',
            'repeat_customers': 'Khách hàng quay lại',
            'new_customers': 'Khách hàng mới',
            'unique_products_sold': 'Số sản phẩm đã bán',
            'product_diversity_score': 'Độ đa dạng sản phẩm',
            'peak_hour': 'Giờ cao điểm',
            'avg_review_score': 'Điểm đánh giá trung bình'
        }
        
        # Tính severity dựa trên deviation và z-score
        def get_severity(deviation_pct, z_score):
            if abs(deviation_pct) > 50 or abs(z_score) > 3:
                return 'CAO'
            elif abs(deviation_pct) > 30 or abs(z_score) > 2:
                return 'TRUNG BÌNH'
            else:
                return 'THẤP'
        
        # Format giá trị cho dễ đọc
        def format_value(value, feature_name):
            if feature_name in ['total_revenue', 'avg_order_value']:
                return round(value, 2)
            elif feature_name in ['product_diversity_score', 'avg_review_score']:
                return round(value, 2)
            elif feature_name in ['order_count', 'customer_count', 'repeat_customers', 
                                  'new_customers', 'unique_products_sold', 'peak_hour']:
                return int(value) if value == int(value) else round(value, 1)
            else:
                return round(value, 2)
        
        anomalous_features_simple = []
        for f in anomalous_features:
            feat_name = f['feature_name']
            deviation = f['deviation_percent']
            severity = get_severity(deviation, f['z_score'])
            
            # Xác định hướng thay đổi
            if deviation > 0:
                direction = 'TĂNG'
            elif deviation < 0:
                direction = 'GIẢM'
            else:
                direction = 'KHÔNG ĐỔI'
            
            anomalous_features_simple.append({
                'metric': feature_name_map.get(feat_name, feat_name),
                'metric_code': feat_name,
                'gia_tri_hien_tai': format_value(f['current_value'], feat_name),
                'gia_tri_trung_binh': format_value(f['historical_mean'], feat_name),
                'thay_doi': {
                    'phan_tram': round(abs(deviation), 1),
                    'huong': direction
                },
                'muc_do_nghiem_trong': severity
            })
        
        # So sánh với tuần trước và tháng trước (chỉ cho features bất thường)
        comparison_simple = {}
        if comparison_summary:
            anomalous_feature_names = {f['feature_name'] for f in anomalous_features}
            for feat_name in anomalous_feature_names:
                if feat_name in comparison_summary:
                    comp = comparison_summary[feat_name]
                    metric_name = feature_name_map.get(feat_name, feat_name)
                    
                    comparison_simple[metric_name] = {}
                    
                    if comp.get('vs_1_week'):
                        v7 = comp['vs_1_week']
                        comparison_simple[metric_name]['so_voi_1_tuan_truoc'] = {
                            'thay_doi_phan_tram': round(abs(v7.get('deviation_pct', 0)), 1),
                            'huong': v7.get('trend', 'N/A')
                        }
                    
                    if comp.get('vs_1_month'):
                        v30 = comp['vs_1_month']
                        comparison_simple[metric_name]['so_voi_1_thang_truoc'] = {
                            'thay_doi_phan_tram': round(abs(v30.get('deviation_pct', 0)), 1),
                            'huong': v30.get('trend', 'N/A')
                        }
        
        output = {
            'ngay': report_date.isoformat(),
            'chi_nhanh': int(branch_id),
            'co_bat_thuong': bool(is_anomaly_iforest or weekday_result.get('is_anomaly', False)),
            'so_luong_chi_tieu_bat_thuong': len(anomalous_features),
            'chi_tieu_bat_thuong': anomalous_features_simple,
            'so_sanh': comparison_simple if comparison_simple else None
        }
    else:
        # Version đầy đủ
        output = {
            'prediction_date': report_date.isoformat(),
            'branch_id': int(branch_id),
            'timestamp': datetime.now().isoformat(),
            'overall_result': {
                'is_anomaly': bool(is_anomaly_iforest or weekday_result.get('is_anomaly', False)),
                'isolation_forest_result': {
                    'is_anomaly': bool(is_anomaly_iforest),
                    'anomaly_score': float(anomaly_score),
                    'confidence_level': float(confidence),
                    'confidence_percent': float(confidence * 100)
                },
                'historical_comparison_result': historical_info
            },
            'anomalous_features': anomalous_features,
            'feature_values': feature_values,
            'statistics': statistics_info,
            'comparison_summary': comparison_summary,
            'individual_method_results': individual_results,
            'model_info': model_info,
            'score_statistics': score_stats if score_stats else None
        }
    
    # Convert toàn bộ output sang JSON-serializable format
    output = _make_json_serializable(output)
    
    return output


def extract_contamination(model_entity) -> float:
    """Lấy contamination từ hyperparameters của model."""
    contamination = 0.1
    if getattr(model_entity, "hyperparameters", None):
        try:
            hyperparams = json.loads(model_entity.hyperparameters)
            contamination = float(hyperparams.get("contamination", contamination))
        except Exception:
            pass
    return contamination


def adjust_confidence_with_historical(
    base_confidence: float,
    weekday_result: dict,
    is_anomaly_iforest: bool
) -> Tuple[float, List[str]]:
    """
    Điều chỉnh confidence dựa trên Historical Comparison
    
    Args:
        base_confidence: Confidence từ Isolation Forest (0-1)
        weekday_result: Kết quả từ Historical Comparison
        is_anomaly_iforest: Kết quả từ Isolation Forest
    
    Returns:
        Tuple (adjusted_confidence, adjustment_reasons)
    """
    adjusted_confidence = base_confidence
    adjustment_reasons = []
    
    historical_is_anomaly = weekday_result.get('is_anomaly', False)
    anomalies = weekday_result.get('anomalies', [])
    
    # 1. ĐỒNG THUẬN (Agreement)
    if is_anomaly_iforest == historical_is_anomaly:
        # Cả 2 phương pháp đồng ý → Tăng confidence
        if is_anomaly_iforest:
            # Cả 2 đều phát hiện anomaly → Confidence cao hơn
            agreement_boost = 0.15  # Tăng 15%
            adjusted_confidence = min(0.95, adjusted_confidence + agreement_boost)
            adjustment_reasons.append(f"+15% (Đồng thuận: cả 2 phát hiện anomaly)")
        else:
            # Cả 2 đều không phát hiện → Confidence cao hơn
            agreement_boost = 0.10  # Tăng 10%
            adjusted_confidence = min(0.95, adjusted_confidence + agreement_boost)
            adjustment_reasons.append(f"+10% (Đồng thuận: cả 2 không phát hiện anomaly)")
    else:
        # 2 phương pháp không đồng ý → Giảm confidence
        disagreement_penalty = 0.20  # Giảm 20%
        adjusted_confidence = max(0.3, adjusted_confidence - disagreement_penalty)
        adjustment_reasons.append(f"-20% (Không đồng thuận: Isolation Forest={'phát hiện' if is_anomaly_iforest else 'không phát hiện'}, Historical={'phát hiện' if historical_is_anomaly else 'không phát hiện'})")
    
    # 2. SỐ LƯỢNG ANOMALIES (nếu có)
    if historical_is_anomaly and len(anomalies) > 0:
        # Nhiều features bất thường → Confidence cao hơn
        anomaly_count_boost = min(0.10, len(anomalies) * 0.02)  # Tối đa 10%
        adjusted_confidence = min(0.95, adjusted_confidence + anomaly_count_boost)
        if anomaly_count_boost > 0:
            adjustment_reasons.append(f"+{anomaly_count_boost*100:.0f}% ({len(anomalies)} feature(s) bất thường)")
    
    # 3. MỨC ĐỘ DEVIATION (Z-score, deviation %)
    if historical_is_anomaly and len(anomalies) > 0:
        max_z_score = 0.0
        max_deviation = 0.0
        for anomaly in anomalies:
            z_score = abs(anomaly.get('z_score', 0))
            deviation = abs(anomaly.get('deviation_pct', 0))
            max_z_score = max(max_z_score, z_score)
            max_deviation = max(max_deviation, deviation)
        
        # Z-score cao (>3) hoặc deviation lớn (>30%) → Confidence cao hơn
        if max_z_score > 3.0 or max_deviation > 30.0:
            severity_boost = 0.10  # Tăng 10%
            adjusted_confidence = min(0.95, adjusted_confidence + severity_boost)
            adjustment_reasons.append(f"+10% (Mức độ cao: z-score={max_z_score:.1f}, deviation={max_deviation:.1f}%)")
        elif max_z_score < 2.0 and max_deviation < 10.0:
            # Z-score thấp và deviation nhỏ → Confidence thấp hơn
            severity_penalty = 0.10  # Giảm 10%
            adjusted_confidence = max(0.3, adjusted_confidence - severity_penalty)
            adjustment_reasons.append(f"-10% (Mức độ thấp: z-score={max_z_score:.1f}, deviation={max_deviation:.1f}%)")
    
    # 4. ĐỒNG THUẬN GIỮA CÁC PHƯƠNG PHÁP (nếu dùng 'both')
    if 'individual_results' in weekday_result:
        methods_agree = 0
        total_methods = 0
        for method, result in weekday_result['individual_results'].items():
            total_methods += 1
            if result.get('is_anomaly', False) == historical_is_anomaly:
                methods_agree += 1
        
        if total_methods > 0:
            agreement_ratio = methods_agree / total_methods
            # Nếu tất cả phương pháp đồng ý → Confidence cao hơn
            if agreement_ratio == 1.0:
                methods_boost = 0.05  # Tăng 5%
                adjusted_confidence = min(0.95, adjusted_confidence + methods_boost)
                adjustment_reasons.append(f"+5% (Tất cả {total_methods} phương pháp đồng ý)")
            elif agreement_ratio < 0.5:
                # Ít hơn 50% phương pháp đồng ý → Confidence thấp hơn
                methods_penalty = 0.10  # Giảm 10%
                adjusted_confidence = max(0.3, adjusted_confidence - methods_penalty)
                adjustment_reasons.append(f"-10% (Chỉ {methods_agree}/{total_methods} phương pháp đồng ý)")
    
    return max(0.3, min(0.95, adjusted_confidence)), adjustment_reasons


def fetch_history_metrics(db: DatabaseConnection, branch_id: int,
                          end_date: date, history_days: int) -> List[DailyBranchMetrics]:
    """Lấy lịch sử metrics để tính scores."""
    query = """
        SELECT *
        FROM daily_branch_metrics
        WHERE branch_id = %s
          AND report_date <= %s
        ORDER BY report_date DESC
        LIMIT %s
    """
    rows = db.execute_query(query, (branch_id, end_date, history_days))
    metrics = [DailyBranchMetrics.from_dict(row) for row in rows]
    return metrics


def compute_scores_for_metrics(predictor: MLPredictor,
                               model,
                               scaler,
                               metrics: List[DailyBranchMetrics],
                               score_stats: dict) -> List[float]:
    """Tính anomaly scores cho danh sách metrics."""
    scores = []
    # Tắt warning về feature names khi tính scores cho nhiều metrics
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore', category=UserWarning, message='.*feature names.*')
    for metric in metrics:
        _, score, _ = predictor.predict(model, scaler, metric, score_stats)
        scores.append(score)
    return scores


def plot_threshold_confidence(report_date: date,
                             target_score: float,
                             target_confidence: float,
                             is_anomaly: bool,
                             historical_scores: List[float],
                             score_stats: dict,
                        contamination: float,
                             output_dir: Path) -> Optional[Path]:
    """
    Vẽ biểu đồ threshold và confidence để hiển thị độ tin cậy.
    
    Args:
        report_date: Ngày dự đoán
        target_score: Anomaly score của ngày dự đoán (0-1)
        target_confidence: Confidence level (0-1)
        is_anomaly: True nếu là anomaly
        historical_scores: List scores từ historical data
        score_stats: Score statistics từ training
        contamination: Contamination rate
        output_dir: Thư mục lưu biểu đồ
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = report_date.strftime("%Y%m%d")
    output_path = output_dir / f"iforest_threshold_confidence_{timestamp}.png"
    
    # Tính threshold từ contamination rate
    threshold_percentile = 100.0 * (1.0 - min(max(contamination, 1e-6), 0.99))
    
    # Tính threshold từ historical scores hoặc contamination rate
    if historical_scores and len(historical_scores) > 0:
        # Historical scores đã là normalized (0-1)
        threshold = float(np.percentile(historical_scores, threshold_percentile))
    else:
        # Ước tính threshold từ contamination rate
        # Contamination 10% → threshold ở p90 = 0.9 (top 10% scores cao nhất là anomaly)
        threshold = 1.0 - contamination
        threshold = max(0.5, min(0.95, threshold))  # Clamp trong khoảng hợp lý
    
    # Tạo figure với 2 subplots: histogram và confidence bar
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    # Subplot 1: Histogram của historical scores + threshold + target score
    if historical_scores and len(historical_scores) > 0:
        scores_array = np.array(historical_scores)
        bins = max(20, min(50, int(np.sqrt(len(historical_scores)))))
        
        # Vẽ histogram
        n, bins_edges, patches = ax1.hist(scores_array, bins=bins, color='#4caf50', 
                                          alpha=0.7, edgecolor='black', label='Historical Scores')
        
        # Tô màu các vùng
        for i, patch in enumerate(patches):
            bin_center = (bins_edges[i] + bins_edges[i+1]) / 2
            if bin_center < 0.3:
                patch.set_facecolor('#4caf50')  # Xanh lá - Normal
            elif bin_center < 0.6:
                patch.set_facecolor('#ff9800')  # Cam - Suspicious
            else:
                patch.set_facecolor('#f44336')  # Đỏ - Anomaly
    else:
        # Nếu không có historical scores, vẽ distribution từ score_stats
        if score_stats:
            mean_score = score_stats.get('mean_score', 0.5)
            std_score = score_stats.get('std_score', 0.1)
            x = np.linspace(0, 1, 100)
            y = np.exp(-0.5 * ((x - mean_score) / std_score) ** 2)
            ax1.plot(x, y, color='#4caf50', linewidth=2, label='Expected Distribution')
            ax1.fill_between(x, 0, y, alpha=0.3, color='#4caf50')
    
    # Vẽ threshold line
    ax1.axvline(threshold, color='#d32f2f', linestyle='--', linewidth=2.5,
                label=f'Threshold (p{threshold_percentile:.1f}) = {threshold:.3f}')
    
    # Vẽ target score
    color = '#c62828' if is_anomaly else '#4caf50'
    marker = 'X' if is_anomaly else 'o'
    size = 200 if is_anomaly else 150
    anomaly_label = 'Anomaly' if is_anomaly else 'Normal'
    ax1.scatter([target_score], [0], color=color, marker=marker, s=size, 
               zorder=10, edgecolors='black', linewidths=2,
               label=f'Target Date: {target_score:.3f} ({anomaly_label})')
    
    # Vẽ vùng confidence (khoảng cách đến threshold)
    distance_to_threshold = abs(target_score - threshold)
    if target_score < threshold:
        # Normal side
        ax1.axvspan(target_score - distance_to_threshold * 0.1, 
                   target_score + distance_to_threshold * 0.1,
                   alpha=0.2, color='#4caf50', label='Confidence Zone')
    else:
        # Anomaly side
        ax1.axvspan(target_score - distance_to_threshold * 0.1, 
                   target_score + distance_to_threshold * 0.1,
                   alpha=0.2, color='#f44336', label='Confidence Zone')
    
    # Vẽ các vùng phân loại
    ax1.axvspan(0, 0.3, alpha=0.1, color='#4caf50', label='Normal Zone (0.0-0.3)')
    ax1.axvspan(0.3, 0.6, alpha=0.1, color='#ff9800', label='Suspicious Zone (0.3-0.6)')
    ax1.axvspan(0.6, 1.0, alpha=0.1, color='#f44336', label='Anomaly Zone (0.6-1.0)')
    
    ax1.set_xlabel('Anomaly Score (0-1)', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Frequency', fontsize=12, fontweight='bold')
    ax1.set_title(f'Anomaly Score Distribution & Threshold\nTarget Date: {report_date}', 
                 fontsize=14, fontweight='bold')
    ax1.legend(loc='upper right', fontsize=9)
    ax1.grid(True, linestyle='--', alpha=0.3)
    ax1.set_xlim(0, 1)
    
    # Subplot 2: Confidence Level Bar Chart
    confidence_percent = target_confidence * 100
    
    # Tạo bar chart với màu sắc theo confidence level
    if confidence_percent >= 80:
        bar_color = '#4caf50'  # Xanh lá - Rất tin cậy
        confidence_label = 'Rất Tin Cậy'
    elif confidence_percent >= 60:
        bar_color = '#ff9800'  # Cam - Tin cậy
        confidence_label = 'Tin Cậy'
    elif confidence_percent >= 40:
        bar_color = '#ffc107'  # Vàng - Trung bình
        confidence_label = 'Trung Bình'
    else:
        bar_color = '#f44336'  # Đỏ - Không tin cậy
        confidence_label = 'Không Tin Cậy'
    
    bars = ax2.barh([0], [confidence_percent], color=bar_color, alpha=0.8, 
                   edgecolor='black', linewidth=2, height=0.6)
    
    # Thêm text hiển thị giá trị
    ax2.text(confidence_percent / 2, 0, f'{confidence_percent:.1f}%\n{confidence_label}',
            ha='center', va='center', fontsize=14, fontweight='bold', color='white')
    
    # Vẽ các mức threshold cho confidence
    ax2.axvline(80, color='#4caf50', linestyle='--', linewidth=1.5, alpha=0.7, label='Rất Tin Cậy (≥80%)')
    ax2.axvline(60, color='#ff9800', linestyle='--', linewidth=1.5, alpha=0.7, label='Tin Cậy (≥60%)')
    ax2.axvline(40, color='#ffc107', linestyle='--', linewidth=1.5, alpha=0.7, label='Trung Bình (≥40%)')
    
    ax2.set_xlabel('Confidence Level (%)', fontsize=12, fontweight='bold')
    ax2.set_title(f'Độ Tin Cậy Dự Đoán\nAnomaly Score: {target_score:.3f} | Distance to Threshold: {distance_to_threshold:.3f}',
                 fontsize=14, fontweight='bold')
    ax2.set_xlim(0, 100)
    ax2.set_ylim(-0.5, 0.5)
    ax2.set_yticks([])
    ax2.legend(loc='upper right', fontsize=9)
    ax2.grid(True, linestyle='--', alpha=0.3, axis='x')
    
    # Thêm thông tin chi tiết
    result_label = '🚨 ANOMALY' if is_anomaly else '✅ NORMAL'
    info_text = f"""
    Thông Tin Dự Đoán:
    • Ngày: {report_date}
    • Anomaly Score: {target_score:.4f}
    • Threshold: {threshold:.4f}
    • Khoảng cách đến Threshold: {distance_to_threshold:.4f}
    • Confidence Level: {confidence_percent:.1f}% ({confidence_label})
    • Kết quả: {result_label}
    """
    
    fig.text(0.02, 0.02, info_text, fontsize=10, family='monospace',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout(rect=[0, 0.15, 1, 1])
    
    # Tắt warning về missing glyphs khi save
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore', category=UserWarning, module='matplotlib')
        fig.savefig(output_path, dpi=300, bbox_inches='tight')
    
    plt.close(fig)

    return output_path


def main() -> None:
    args = parse_args()
    
    # Parse date
    try:
        target_date = date.fromisoformat(args.report_date)
    except ValueError:
        print(f"❌ Invalid --date format; use YYYY-MM-DD")
        sys.exit(1)
    
    print("=" * 80)
    print(f"📅 PREDICTION FOR DATE: {args.report_date}")
    print("=" * 80)
    print(f"Branch ID: {args.branch_id}")
    if args.model_id:
        print(f"Model ID: {args.model_id}")
    elif args.model_version:
        print(f"Model Version: {args.model_version}")
    else:
        print(f"Model: Active model for branch {args.branch_id}")
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
        # Khởi tạo repositories
        metrics_repo = MetricsRepositoryImpl(db)
        model_repo = ModelRepositoryImpl(db)
        predictor = MLPredictor()
        
        # Load model
        # Ưu tiên: model-id > model-version > active model
        print(f"\n📦 Đang load model...")
        if args.model_id:
            model_entity = model_repo.find_by_id(args.model_id)
            if not model_entity:
                print(f"❌ Không tìm thấy model với ID {args.model_id}")
                sys.exit(1)
            print(f"   Đang dùng model theo ID: {args.model_id}")
        elif args.model_version:
            model_entity = model_repo.find_by_branch_and_version(args.branch_id, args.model_version)
            if not model_entity:
                print(f"❌ Không tìm thấy model version '{args.model_version}' cho branch {args.branch_id}")
                print(f"💡 Gợi ý: Kiểm tra lại version hoặc dùng --model-id để chỉ định ID cụ thể")
                sys.exit(1)
            print(f"   Đang dùng model theo version: {args.model_version}")
        else:
            model_entity = model_repo.find_active_by_branch(args.branch_id)
            if not model_entity:
                print(f"❌ Không tìm thấy active model cho branch {args.branch_id}")
                sys.exit(1)
            print(f"   Đang dùng active model")
        
        print(f"✅ Đã load model:")
        print(f"   Model ID: {model_entity.id}")
        print(f"   Model Name: {model_entity.model_name}")
        print(f"   Model Version: {model_entity.model_version}")
        
        # Load model, scaler và score_stats
        model, scaler, score_stats = predictor.load_model(model_entity)
        contamination = extract_contamination(model_entity)
        
        # Lấy metrics cho target date
        print(f"\n📊 Đang lấy dữ liệu cho ngày {target_date}...")
        metric = metrics_repo.find_by_branch_and_date(args.branch_id, target_date)
        
        if not metric:
            print(f"❌ Không tìm thấy dữ liệu cho ngày {target_date}")
            sys.exit(1)
        
        print(f"✅ Đã lấy dữ liệu")
        
        # Predict với Isolation Forest
        print(f"\n🔮 Đang predict với Isolation Forest...")
        is_anomaly_iforest, anomaly_score, confidence = predictor.predict(model, scaler, metric, score_stats)
        
        print("\n[1] ISOLATION FOREST PREDICTION:")
        print(f"   Anomaly: {'🚨 YES' if is_anomaly_iforest else '✅ NO'}")
        print(f"   Anomaly Score (0-1): {anomaly_score:.4f}")
        print(f"   Confidence: {confidence:.4f}")
        
        # So sánh với phân phối lịch sử
        method_name_map = {
            'weekday': 'WEEKDAY COMPARISON (D-7, D-14, D-21, D-28)',
            'rolling_7': 'ROLLING WINDOW 7 DAYS (tất cả 7 ngày trước)',
            'rolling_30': 'ROLLING WINDOW 30 DAYS (tất cả 30 ngày trước)',
            'both': 'COMBINED COMPARISON (Weekday + Rolling 7 + Rolling 30)'
        }
        print(f"\n[2] HISTORICAL COMPARISON: {method_name_map.get(args.compare_method, args.compare_method)}")
        weekday_result = {'is_anomaly': False, 'anomalies': []}
        
        try:
            comparator = WeekdayComparatorDB(db, args.branch_id)
            weekday_result = comparator.compare_with_historical(target_date, method=args.compare_method)
            
            if 'error' in weekday_result:
                print(f"   ❌ Error: {weekday_result['error']}")
            else:
                # Nếu dùng 'both', hiển thị bảng so sánh rõ ràng
                if args.compare_method == 'both' and 'comparison_summary' in weekday_result:
                    print(f"\n   📊 COMPARISON SUMMARY (So sánh với 1 tuần trước và 1 tháng trước):")
                    print(f"   {'='*100}")
                    print(f"   {'Feature':<30} {'Today':<15} {'vs 1 tuần':<25} {'vs 1 tháng':<25}")
                    print(f"   {'-'*100}")
                    
                    for feat, comp in weekday_result['comparison_summary'].items():
                        today_str = f"{comp['today']:.2f}"
                        
                        # vs 1 tuần
                        if comp['vs_1_week']:
                            v7 = comp['vs_1_week']
                            trend_icon = "⬆️" if v7['trend'] == 'TĂNG' else "⬇️" if v7['trend'] == 'GIẢM' else "➡️"
                            vs_week_str = f"{trend_icon} {v7['deviation_pct']:+.1f}% (mean={v7['mean']:.2f})"
                        else:
                            vs_week_str = "N/A"
                        
                        # vs 1 tháng
                        if comp['vs_1_month']:
                            v30 = comp['vs_1_month']
                            trend_icon = "⬆️" if v30['trend'] == 'TĂNG' else "⬇️" if v30['trend'] == 'GIẢM' else "➡️"
                            vs_month_str = f"{trend_icon} {v30['deviation_pct']:+.1f}% (mean={v30['mean']:.2f})"
                        else:
                            vs_month_str = "N/A"
                        
                        print(f"   {feat:<30} {today_str:<15} {vs_week_str:<25} {vs_month_str:<25}")
                    
                    print(f"   {'='*100}")
                    
                    # Hiển thị thống kê từng phương pháp
                    if 'individual_results' in weekday_result:
                        print(f"\n   📈 Individual Method Results:")
                        for method, result in weekday_result['individual_results'].items():
                            status = "🚨" if result['is_anomaly'] else "✅"
                            method_name = {
                                'weekday': 'Cùng thứ (D-7, D-14, D-21, D-28)',
                                'rolling_7': '7 ngày trước',
                                'rolling_30': '30 ngày trước'
                            }.get(method, method)
                            print(f"      {status} {method_name}: {result['anomaly_count']} anomalies, {result['samples']} samples")
                
                if weekday_result['is_anomaly']:
                    print(f"\n   🚨 Anomaly detected in {len(weekday_result['anomalies'])} feature(s):")
                    for anomaly in weekday_result['anomalies']:
                        detected_by = f" (detected by: {anomaly.get('detected_by', 'N/A')})" if 'detected_by' in anomaly else ""
                        print(f"\n   📊 Feature: {anomaly['feature']}{detected_by}")
                        print(f"      Value today: {anomaly['target_value']:.2f}")
                        print(f"      Historical mean: {anomaly['historical_mean']:.2f}")
                        print(f"      Deviation: {anomaly['deviation_pct']:+.1f}%")
                        print(f"      Z-score: {anomaly['z_score']:.2f}")
                        if anomaly['is_below_p5']:
                            print(f"      ⬇️  Below p5 (rất thấp)")
                        if anomaly['is_above_p95']:
                            print(f"      ⬆️  Above p95 (rất cao)")
                        print(f"      Reasons:")
                        for reason in anomaly['reasons']:
                            print(f"         - {reason}")
                else:
                    print(f"   ✅ No anomalies detected (all features within normal range)")
                
                # In thống kê chi tiết
                if weekday_result.get('statistics'):
                    print(f"\n   📈 Detailed Statistics:")
                    for feat, stats in weekday_result['statistics'].items():
                        methods_used = f" (methods: {', '.join(stats.get('methods', []))})" if 'methods' in stats else ""
                        print(f"      {feat}{methods_used}:")
                        print(f"         Today: {stats['target_value']:.2f}")
                        print(f"         Mean: {stats['historical_mean']:.2f} ± {stats['historical_std']:.2f}")
                        print(f"         Range: [{stats['historical_min']:.2f}, {stats['historical_max']:.2f}]")
                        print(f"         Percentiles: p5={stats['historical_p5']:.2f}, p95={stats['historical_p95']:.2f}")
                        print(f"         Z-score: {stats['z_score']:.2f}")
                        print(f"         Samples: {stats['historical_samples']}")
        except Exception as e:
            print(f"   ❌ Error in weekday comparison: {e}")
            import traceback
            traceback.print_exc()
        
        # Điều chỉnh confidence dựa trên Historical Comparison
        print("\n[2.5] CONFIDENCE ADJUSTMENT:")
        base_confidence = confidence  # Lưu base confidence để hiển thị
        adjusted_confidence, adjustment_reasons = adjust_confidence_with_historical(
            base_confidence, weekday_result, is_anomaly_iforest
        )
        
        print(f"   Base Confidence (Isolation Forest): {base_confidence:.4f} ({base_confidence*100:.1f}%)")
        print(f"   Adjusted Confidence (với Historical): {adjusted_confidence:.4f} ({adjusted_confidence*100:.1f}%)")
        
        if adjustment_reasons:
            print(f"   Điều chỉnh:")
            for reason in adjustment_reasons:
                print(f"      • {reason}")
        else:
            print(f"   (Không có điều chỉnh)")
        
        # Cập nhật confidence để dùng adjusted confidence cho biểu đồ và output
        confidence = adjusted_confidence
        
        # Tổng hợp kết quả
        print("\n[3] FINAL VERDICT:")
        is_anomaly_final = is_anomaly_iforest or weekday_result.get('is_anomaly', False)
        if is_anomaly_final:
            reasons = []
            if is_anomaly_iforest:
                reasons.append("Isolation Forest detected anomaly")
            if weekday_result.get('is_anomaly', False):
                reasons.append(f"Weekday comparison: {len(weekday_result.get('anomalies', []))} feature(s) abnormal")
            print(f"   🚨 ANOMALY DETECTED")
            print(f"   Reasons:")
            for r in reasons:
                print(f"      - {r}")
        else:
            print(f"   ✅ NO ANOMALY DETECTED")
        
        # Show feature snapshot
        print("\n[4] FEATURE VALUES:")
        md = metric.to_dict()
        features = model_entity.feature_list
        if features:
            feature_list = json.loads(features)
            ordered = {k: md.get(k) for k in feature_list if k in md}
        else:
            ordered = {k: md.get(k) for k in WeekdayComparatorDB.NUMERIC_FEATURES if k in md}
        
        for k, v in ordered.items():
            print(f"   - {k}: {v}")
        
        print("\n" + "=" * 80)

        # Tạo và in JSON output (không lưu file, không tạo biểu đồ)
        print(f"\n📄 Đang tạo JSON output...")
        try:
            # Tạo JSON output
            json_output = create_anomaly_json_output(
                report_date=target_date,
                branch_id=args.branch_id,
                is_anomaly_iforest=is_anomaly_iforest,
                anomaly_score=anomaly_score,
                confidence=confidence,
                weekday_result=weekday_result,
                metric=metric,
                model_entity=model_entity,
                score_stats=score_stats,
                summary_only=args.summary_only
            )
            
            # In JSON ra console (không lưu file)
            print("\n" + "=" * 80)
            print("📋 JSON OUTPUT:")
            print("=" * 80)
            print(json.dumps(json_output, indent=2, ensure_ascii=False))
            print("=" * 80)
            
            if not args.summary_only:
                print(f"\n   Confidence: {confidence:.4f} ({confidence*100:.1f}%)")
                if 'anomalous_features' in json_output:
                    print(f"   Anomalous features: {len(json_output['anomalous_features'])}")
            else:
                if 'chi_tieu_bat_thuong' in json_output:
                    print(f"\n   Số chỉ tiêu bất thường: {len(json_output['chi_tieu_bat_thuong'])}")
                if 'co_bat_thuong' in json_output:
                    status = "CÓ" if json_output['co_bat_thuong'] else "KHÔNG"
                    print(f"   Có bất thường: {status}")
            
        except Exception as json_exc:
            print(f"⚠️  Lỗi khi tạo JSON output: {json_exc}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.disconnect()


if __name__ == "__main__":
    main()

