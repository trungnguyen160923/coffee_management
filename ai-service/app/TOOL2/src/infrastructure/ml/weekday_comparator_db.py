"""
Weekday Comparator DB - So sánh dữ liệu ngày hiện tại với phân phối cùng weekday từ các tuần trước (Database version)
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta, date

from ...domain.entities.metrics import DailyBranchMetrics
from ..database.connection import DatabaseConnection


class WeekdayComparatorDB:
    """
    So sánh dữ liệu một ngày với phân phối cùng weekday từ các tuần trước (sử dụng database)
    """
    
    NUMERIC_FEATURES = [
        'total_revenue', 'order_count', 'avg_order_value',
        'customer_count', 'repeat_customers', 'new_customers',
        'unique_products_sold', 'product_diversity_score',
        'peak_hour', 'day_of_week', 'is_weekend',
        'avg_review_score'
    ]
    
    def __init__(self, db: DatabaseConnection, branch_id: int):
        """
        Args:
            db: DatabaseConnection instance
            branch_id: ID chi nhánh
        """
        self.db = db
        self.branch_id = branch_id
    
    def get_same_weekday_historical_data(self, target_date: date, 
                                         weeks_back: List[int] = [1, 2, 3, 4]) -> List[DailyBranchMetrics]:
        """
        Lấy dữ liệu cùng weekday từ các tuần trước
        
        Args:
            target_date: Ngày cần kiểm tra
            weeks_back: Danh sách số tuần lùi lại (mặc định [1,2,3,4] = D-7, D-14, D-21, D-28)
        
        Returns:
            List[DailyBranchMetrics] chứa các metrics cùng weekday từ các tuần trước
        """
        target_weekday = target_date.weekday()  # 0=Monday, 6=Sunday
        
        historical_dates = []
        for weeks in weeks_back:
            historical_date = target_date - timedelta(days=7 * weeks)
            historical_dates.append(historical_date)
        
        # Query database cho các ngày này
        historical_metrics = []
        for hist_date in historical_dates:
            # Tìm các ngày gần nhất có cùng weekday trong khoảng ±3 ngày
            start_date = hist_date - timedelta(days=3)
            end_date = hist_date + timedelta(days=3)
            
            query = """
            SELECT * FROM daily_branch_metrics
            WHERE branch_id = %s
            AND report_date >= %s
            AND report_date <= %s
            ORDER BY ABS(DATEDIFF(report_date, %s)) ASC
            LIMIT 1
            """
            result = self.db.execute_query(query, (self.branch_id, start_date, end_date, hist_date))
            
            if result:
                # Kiểm tra xem có cùng weekday không
                found_date = result[0]['report_date']
                if isinstance(found_date, str):
                    found_date = date.fromisoformat(found_date)
                elif hasattr(found_date, 'date'):
                    found_date = found_date.date()
                
                if found_date.weekday() == target_weekday:
                    historical_metrics.append(DailyBranchMetrics.from_dict(result[0]))
        
        return historical_metrics
    
    def get_rolling_window_data(self, target_date: date, 
                                days_back: int = 7) -> List[DailyBranchMetrics]:
        """
        Lấy dữ liệu từ cửa sổ trượt (rolling window) - tất cả các ngày trong N ngày trước
        
        Args:
            target_date: Ngày cần kiểm tra
            days_back: Số ngày lùi lại (mặc định 7 = lấy 7 ngày trước)
        
        Returns:
            List[DailyBranchMetrics] chứa các metrics trong khoảng [target_date - days_back, target_date)
        """
        start_date = target_date - timedelta(days=days_back)
        end_date = target_date - timedelta(days=1)  # Không bao gồm target_date
        
        query = """
        SELECT * FROM daily_branch_metrics
        WHERE branch_id = %s
        AND report_date >= %s
        AND report_date < %s
        ORDER BY report_date ASC
        """
        result = self.db.execute_query(query, (self.branch_id, start_date, end_date))
        
        if result:
            return [DailyBranchMetrics.from_dict(row) for row in result]
        return []
    
    def _calculate_statistics(self, metrics_list: List[DailyBranchMetrics], 
                             feature: str) -> Dict:
        """Tính thống kê cho một feature"""
        if not metrics_list:
            return None
        
        values = []
        for metric in metrics_list:
            metric_dict = metric.to_dict()
            value = metric_dict.get(feature)
            if value is not None:
                # Convert to float, handling Decimal, int, bool, etc.
                try:
                    if isinstance(value, bool):
                        value = float(value)
                    elif hasattr(value, '__float__'):
                        value = float(value)
                    else:
                        value = float(value)
                    
                    if not (isinstance(value, float) and np.isnan(value)):
                        values.append(value)
                except (ValueError, TypeError):
                    continue
        
        if not values:
            return None
        
        values = np.array(values)
        return {
            'mean': float(np.mean(values)),
            'std': float(np.std(values)) if len(values) > 1 else 0.0,
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'p5': float(np.percentile(values, 5)),
            'p95': float(np.percentile(values, 95)),
            'samples': len(values)
        }
    
    def _check_anomaly(self, target_value, stats: Dict) -> Dict:
        """Kiểm tra xem giá trị có phải anomaly không"""
        if stats is None or target_value is None:
            return {'is_anomaly': False, 'reasons': []}
        
        # Convert target_value to float (handle Decimal, int, bool, etc.)
        try:
            if isinstance(target_value, bool):
                target_value = float(target_value)
            elif hasattr(target_value, '__float__'):
                target_value = float(target_value)
            else:
                target_value = float(target_value)
        except (ValueError, TypeError):
            return {'is_anomaly': False, 'reasons': []}
        
        reasons = []
        is_anomaly = False
        
        # Tính Z-score
        if stats['std'] > 0:
            z_score = (target_value - stats['mean']) / stats['std']
        else:
            z_score = 0.0
        
        # Tính deviation percentage
        if stats['mean'] != 0:
            deviation_pct = ((target_value - stats['mean']) / stats['mean']) * 100
        else:
            deviation_pct = 0.0
        
        # Kiểm tra các điều kiện
        is_below_p5 = target_value < stats['p5']
        is_above_p95 = target_value > stats['p95']
        is_high_z = abs(z_score) > 2
        
        if is_below_p5:
            reasons.append(f"Value {target_value:.2f} below p5 ({stats['p5']:.2f})")
            is_anomaly = True
        if is_above_p95:
            reasons.append(f"Value {target_value:.2f} above p95 ({stats['p95']:.2f})")
            is_anomaly = True
        if is_high_z:
            reasons.append(f"Z-score {z_score:.2f} exceeds ±2")
            is_anomaly = True
        
        return {
            'is_anomaly': is_anomaly,
            'z_score': z_score,
            'deviation_pct': deviation_pct,
            'is_below_p5': is_below_p5,
            'is_above_p95': is_above_p95,
            'reasons': reasons
        }
    
    def compare_with_historical(self, target_date: date,
                                features: Optional[List[str]] = None,
                                method: str = 'weekday') -> Dict:
        """
        So sánh dữ liệu target_date với phân phối lịch sử
        
        Args:
            target_date: Ngày cần kiểm tra
            features: Danh sách features cần kiểm tra (mặc định: NUMERIC_FEATURES)
            method: Phương pháp so sánh:
                - 'weekday': So sánh với cùng weekday từ các tuần trước (D-7, D-14, D-21, D-28)
                - 'rolling_7': So sánh với 7 ngày trước (tất cả các ngày trong 7 ngày gần nhất)
                - 'rolling_30': So sánh với 30 ngày trước (tất cả các ngày trong 30 ngày gần nhất)
                - 'both': So sánh với cả weekday và rolling windows (7 và 30 ngày)
        
        Returns:
            Dict chứa:
            - is_anomaly: bool
            - anomalies: List[Dict] - chi tiết các feature bất thường
            - statistics: Dict - thống kê cho từng feature
            - method_used: str - phương pháp đã sử dụng
        """
        if features is None:
            features = [f for f in self.NUMERIC_FEATURES if f != 'day_of_week']
        
        # Lấy dữ liệu target date
        query = """
        SELECT * FROM daily_branch_metrics
        WHERE branch_id = %s AND report_date = %s
        """
        result = self.db.execute_query(query, (self.branch_id, target_date))
        
        if not result:
            raise ValueError(f"No data found for date {target_date}")
        
        target_metric = DailyBranchMetrics.from_dict(result[0])
        target_dict = target_metric.to_dict()
        
        # Chọn phương pháp so sánh
        if method == 'weekday':
            historical_metrics = self.get_same_weekday_historical_data(target_date)
            method_name = "Weekday Comparison (D-7, D-14, D-21, D-28)"
        elif method == 'rolling_7':
            historical_metrics = self.get_rolling_window_data(target_date, days_back=7)
            method_name = "Rolling Window 7 Days"
        elif method == 'rolling_30':
            historical_metrics = self.get_rolling_window_data(target_date, days_back=30)
            method_name = "Rolling Window 30 Days"
        elif method == 'both':
            # So sánh với cả 3 phương pháp và tổng hợp
            weekday_metrics = self.get_same_weekday_historical_data(target_date)
            rolling_7_metrics = self.get_rolling_window_data(target_date, days_back=7)
            rolling_30_metrics = self.get_rolling_window_data(target_date, days_back=30)
            
            # Tổng hợp kết quả từ cả 3 phương pháp
            return self._compare_combined(target_dict, weekday_metrics, rolling_7_metrics, rolling_30_metrics, features)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        # Tính thống kê và phát hiện anomalies
        anomalies = []
        statistics = {}
        all_anomaly = False
        
        for feature in features:
            target_value = target_dict.get(feature)
            if target_value is None:
                continue
            
            # Convert target_value to float
            try:
                if isinstance(target_value, bool):
                    target_value = float(target_value)
                elif hasattr(target_value, '__float__'):
                    target_value = float(target_value)
                else:
                    target_value = float(target_value)
            except (ValueError, TypeError):
                continue
            
            stats = self._calculate_statistics(historical_metrics, feature)
            if stats is None:
                continue
            
            statistics[feature] = {
                'target_value': target_value,
                'historical_mean': stats['mean'],
                'historical_std': stats['std'],
                'historical_min': stats['min'],
                'historical_max': stats['max'],
                'historical_p5': stats['p5'],
                'historical_p95': stats['p95'],
                'historical_samples': stats['samples'],
                'z_score': (target_value - stats['mean']) / stats['std'] if stats['std'] > 0 else 0.0
            }
            
            anomaly_check = self._check_anomaly(target_value, stats)
            if anomaly_check['is_anomaly']:
                all_anomaly = True
                anomalies.append({
                    'feature': feature,
                    'target_value': target_value,
                    'historical_mean': stats['mean'],
                    'deviation_pct': anomaly_check['deviation_pct'],
                    'z_score': anomaly_check['z_score'],
                    'is_below_p5': anomaly_check['is_below_p5'],
                    'is_above_p95': anomaly_check['is_above_p95'],
                    'reasons': anomaly_check['reasons']
                })
        
        return {
            'is_anomaly': all_anomaly,
            'anomalies': anomalies,
            'statistics': statistics,
            'method_used': method_name,
            'historical_samples': len(historical_metrics)
        }
    
    def _compare_combined(self, target_dict: Dict, weekday_metrics: List[DailyBranchMetrics],
                         rolling_7_metrics: List[DailyBranchMetrics],
                         rolling_30_metrics: List[DailyBranchMetrics],
                         features: List[str]) -> Dict:
        """So sánh kết hợp cả 3 phương pháp"""
        anomalies = []
        statistics = {}
        comparison_summary = {}
        individual_results = {}
        
        # So sánh với weekday
        weekday_result = self._compare_method(target_dict, weekday_metrics, features, 'weekday')
        individual_results['weekday'] = weekday_result
        
        # So sánh với rolling_7
        rolling_7_result = self._compare_method(target_dict, rolling_7_metrics, features, 'rolling_7')
        individual_results['rolling_7'] = rolling_7_result
        
        # So sánh với rolling_30
        rolling_30_result = self._compare_method(target_dict, rolling_30_metrics, features, 'rolling_30')
        individual_results['rolling_30'] = rolling_30_result
        
        # Tổng hợp kết quả
        all_anomaly = False
        for feature in features:
            target_value = target_dict.get(feature)
            if target_value is None:
                continue
            
            # Convert target_value to float
            try:
                if isinstance(target_value, bool):
                    target_value = float(target_value)
                elif hasattr(target_value, '__float__'):
                    target_value = float(target_value)
                else:
                    target_value = float(target_value)
            except (ValueError, TypeError):
                continue
            
            # Lấy thống kê từ rolling_7 và rolling_30
            stats_7 = self._calculate_statistics(rolling_7_metrics, feature)
            stats_30 = self._calculate_statistics(rolling_30_metrics, feature)
            
            if stats_7 is None and stats_30 is None:
                continue
            
            # Tính toán cho comparison summary
            vs_1_week = None
            vs_1_month = None
            
            if stats_7:
                deviation_pct = ((target_value - stats_7['mean']) / stats_7['mean'] * 100) if stats_7['mean'] != 0 else 0
                trend = 'TĂNG' if deviation_pct > 5 else 'GIẢM' if deviation_pct < -5 else 'ỔN ĐỊNH'
                vs_1_week = {
                    'mean': stats_7['mean'],
                    'deviation_pct': deviation_pct,
                    'trend': trend
                }
            
            if stats_30:
                deviation_pct = ((target_value - stats_30['mean']) / stats_30['mean'] * 100) if stats_30['mean'] != 0 else 0
                trend = 'TĂNG' if deviation_pct > 5 else 'GIẢM' if deviation_pct < -5 else 'ỔN ĐỊNH'
                vs_1_month = {
                    'mean': stats_30['mean'],
                    'deviation_pct': deviation_pct,
                    'trend': trend
                }
            
            comparison_summary[feature] = {
                'today': target_value,
                'vs_1_week': vs_1_week,
                'vs_1_month': vs_1_month
            }
            
            # Kiểm tra anomaly từ bất kỳ phương pháp nào
            anomaly_weekday = any(a['feature'] == feature for a in weekday_result.get('anomalies', []))
            anomaly_7 = self._check_anomaly(target_value, stats_7)['is_anomaly'] if stats_7 else False
            anomaly_30 = self._check_anomaly(target_value, stats_30)['is_anomaly'] if stats_30 else False
            
            if anomaly_weekday or anomaly_7 or anomaly_30:
                all_anomaly = True
                detected_by = []
                if anomaly_weekday:
                    detected_by.append('weekday')
                if anomaly_7:
                    detected_by.append('rolling_7')
                if anomaly_30:
                    detected_by.append('rolling_30')
                
                # Lấy thống kê tổng hợp
                combined_stats = stats_30 if stats_30 else stats_7
                if combined_stats:
                    anomaly_check = self._check_anomaly(target_value, combined_stats)
                    anomalies.append({
                        'feature': feature,
                        'target_value': target_value,
                        'historical_mean': combined_stats['mean'],
                        'deviation_pct': anomaly_check['deviation_pct'],
                        'z_score': anomaly_check['z_score'],
                        'is_below_p5': anomaly_check['is_below_p5'],
                        'is_above_p95': anomaly_check['is_above_p95'],
                        'reasons': anomaly_check['reasons'],
                        'detected_by': ', '.join(detected_by)
                    })
            
            # Statistics tổng hợp
            if stats_30:
                statistics[feature] = {
                    'target_value': target_value,
                    'historical_mean': stats_30['mean'],
                    'historical_std': stats_30['std'],
                    'historical_min': stats_30['min'],
                    'historical_max': stats_30['max'],
                    'historical_p5': stats_30['p5'],
                    'historical_p95': stats_30['p95'],
                    'historical_samples': stats_30['samples'],
                    'z_score': (target_value - stats_30['mean']) / stats_30['std'] if stats_30['std'] > 0 else 0.0,
                    'methods': ['weekday', 'rolling_7', 'rolling_30']
                }
        
        return {
            'is_anomaly': all_anomaly,
            'anomalies': anomalies,
            'statistics': statistics,
            'comparison_summary': comparison_summary,
            'individual_results': individual_results,
            'method_used': 'Combined (Weekday + Rolling 7 + Rolling 30)'
        }
    
    def _compare_method(self, target_dict: Dict, historical_metrics: List[DailyBranchMetrics],
                       features: List[str], method_name: str) -> Dict:
        """So sánh với một phương pháp cụ thể"""
        anomalies = []
        all_anomaly = False
        
        for feature in features:
            target_value = target_dict.get(feature)
            if target_value is None:
                continue
            
            # Convert target_value to float
            try:
                if isinstance(target_value, bool):
                    target_value = float(target_value)
                elif hasattr(target_value, '__float__'):
                    target_value = float(target_value)
                else:
                    target_value = float(target_value)
            except (ValueError, TypeError):
                continue
            
            stats = self._calculate_statistics(historical_metrics, feature)
            if stats is None:
                continue
            
            anomaly_check = self._check_anomaly(target_value, stats)
            if anomaly_check['is_anomaly']:
                all_anomaly = True
                anomalies.append({
                    'feature': feature,
                    'target_value': target_value,
                    'historical_mean': stats['mean'],
                    'deviation_pct': anomaly_check['deviation_pct'],
                    'z_score': anomaly_check['z_score'],
                    'is_below_p5': anomaly_check['is_below_p5'],
                    'is_above_p95': anomaly_check['is_above_p95'],
                    'reasons': anomaly_check['reasons']
                })
        
        return {
            'is_anomaly': all_anomaly,
            'anomalies': anomalies,
            'samples': len(historical_metrics),
            'anomaly_count': len(anomalies)
        }

