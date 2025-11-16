"""
Metrics Repository Interface
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import date

from ..entities.metrics import DailyBranchMetrics


class IMetricsRepository(ABC):
    """Interface cho repository quản lý metrics"""
    
    @abstractmethod
    def save(self, metrics: DailyBranchMetrics) -> int:
        """Lưu metrics, trả về ID"""
        pass
    
    @abstractmethod
    def find_by_id(self, metric_id: int) -> Optional[DailyBranchMetrics]:
        """Tìm metrics theo ID"""
        pass
    
    @abstractmethod
    def find_by_branch_and_date(self, branch_id: int, report_date: date) -> Optional[DailyBranchMetrics]:
        """Tìm metrics theo branch_id và ngày"""
        pass
    
    @abstractmethod
    def find_for_training(self, branch_id: int, days: int = 90) -> List[DailyBranchMetrics]:
        """Lấy metrics để train model"""
        pass
    
    @abstractmethod
    def find_unpredicted(self, branch_id: Optional[int] = None) -> List[DailyBranchMetrics]:
        """Lấy metrics chưa được predict"""
        pass
    
    @abstractmethod
    def find_all_branches(self) -> List[int]:
        """Lấy danh sách tất cả branch_id có metrics"""
        pass

