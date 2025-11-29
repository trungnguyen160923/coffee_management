"""
Forecast Repository Interface
"""
from abc import ABC, abstractmethod
from typing import Optional, List
from datetime import date

from ..entities.forecast import ForecastResult


class IForecastRepository(ABC):
    """Interface cho repository quản lý forecasts"""
    
    @abstractmethod
    def save(self, forecast: ForecastResult) -> int:
        """Lưu forecast, trả về ID"""
        pass
    
    @abstractmethod
    def find_by_id(self, forecast_id: int) -> Optional[ForecastResult]:
        """Tìm forecast theo ID"""
        pass
    
    @abstractmethod
    def find_latest_by_branch(self, branch_id: int, target_metric: str = None) -> Optional[ForecastResult]:
        """Tìm forecast mới nhất cho branch (có thể filter theo target_metric)"""
        pass
    
    @abstractmethod
    def find_by_branch_and_date_range(self, branch_id: int, start_date: date, end_date: date,
                                     target_metric: str = None) -> List[ForecastResult]:
        """Tìm forecasts trong khoảng thời gian"""
        pass
    
    @abstractmethod
    def find_by_model_id(self, model_id: int) -> List[ForecastResult]:
        """Tìm tất cả forecasts được tạo bởi model"""
        pass

