"""
Forecast Repository Implementation
"""
from typing import Optional, List
from datetime import date

from ...domain.entities.forecast import ForecastResult
from ...domain.repositories.forecast_repository import IForecastRepository
from ..database.connection import DatabaseConnection


class ForecastRepositoryImpl(IForecastRepository):
    """Implementation của forecast repository"""
    
    def __init__(self, db: DatabaseConnection):
        self.db = db
    
    def save(self, forecast: ForecastResult) -> int:
        """Lưu forecast, trả về ID"""
        query = """
        INSERT INTO forecast_results (
            branch_id, forecast_date, forecast_start_date, forecast_end_date,
            model_id, target_metric, algorithm,
            forecast_values, confidence_intervals,
            mae, mse, rmse, mape,
            training_samples_count, training_date_start, training_date_end,
            forecast_horizon_days, created_at
        ) VALUES (
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s
        )
        """
        
        params = (
            forecast.branch_id, forecast.forecast_date, forecast.forecast_start_date, forecast.forecast_end_date,
            forecast.model_id, forecast.target_metric, forecast.algorithm,
            forecast.forecast_values, forecast.confidence_intervals,
            forecast.mae, forecast.mse, forecast.rmse, forecast.mape,
            forecast.training_samples_count, forecast.training_date_start, forecast.training_date_end,
            forecast.forecast_horizon_days, forecast.created_at
        )
        
        result = self.db.execute_query(query, params, fetch=False)
        return result
    
    def find_by_id(self, forecast_id: int) -> Optional[ForecastResult]:
        """Tìm forecast theo ID"""
        query = "SELECT * FROM forecast_results WHERE id = %s"
        result = self.db.execute_query(query, (forecast_id,))
        if result:
            return ForecastResult.from_dict(result[0])
        return None
    
    def find_latest_by_branch(self, branch_id: int, target_metric: str = None) -> Optional[ForecastResult]:
        """Tìm forecast mới nhất cho branch"""
        if target_metric:
            query = """
            SELECT * FROM forecast_results
            WHERE branch_id = %s AND target_metric = %s
            ORDER BY forecast_date DESC, created_at DESC
            LIMIT 1
            """
            params = (branch_id, target_metric)
        else:
            query = """
            SELECT * FROM forecast_results
            WHERE branch_id = %s
            ORDER BY forecast_date DESC, created_at DESC
            LIMIT 1
            """
            params = (branch_id,)
        
        result = self.db.execute_query(query, params)
        if result:
            return ForecastResult.from_dict(result[0])
        return None
    
    def find_by_branch_and_date_range(self, branch_id: int, start_date: date, end_date: date,
                                     target_metric: str = None) -> List[ForecastResult]:
        """Tìm forecasts trong khoảng thời gian"""
        if target_metric:
            query = """
            SELECT * FROM forecast_results
            WHERE branch_id = %s 
            AND target_metric = %s
            AND forecast_start_date <= %s
            AND forecast_end_date >= %s
            ORDER BY forecast_date DESC
            """
            params = (branch_id, target_metric, end_date, start_date)
        else:
            query = """
            SELECT * FROM forecast_results
            WHERE branch_id = %s
            AND forecast_start_date <= %s
            AND forecast_end_date >= %s
            ORDER BY forecast_date DESC
            """
            params = (branch_id, end_date, start_date)
        
        result = self.db.execute_query(query, params)
        return [ForecastResult.from_dict(row) for row in result]
    
    def find_by_model_id(self, model_id: int) -> List[ForecastResult]:
        """Tìm tất cả forecasts được tạo bởi model"""
        query = """
        SELECT * FROM forecast_results
        WHERE model_id = %s
        ORDER BY forecast_date DESC
        """
        result = self.db.execute_query(query, (model_id,))
        return [ForecastResult.from_dict(row) for row in result]

