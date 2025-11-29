"""Models package"""

from app.models.report import Report  # noqa: F401
from app.models.daily_metrics import DailyBranchMetrics  # noqa: F401

__all__ = ["Report", "DailyBranchMetrics"]
