"""
Schemas for Admin Model Management (train/retrain/test).
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IForestTrainParams(BaseModel):
    n_estimators: Optional[int] = Field(None, ge=10, le=2000)
    contamination: Optional[float] = Field(None, gt=0.0, lt=0.5)
    enable_tuning: Optional[bool] = None


class ForecastTrainParams(BaseModel):
    # Prophet-specific knobs currently supported by ForecastTrainer.train_prophet
    seasonality_mode: Optional[str] = Field(None, description="additive|multiplicative")
    yearly_seasonality: Optional[bool] = None
    weekly_seasonality: Optional[bool] = None
    daily_seasonality: Optional[bool] = None
    use_external_regressors: Optional[bool] = None
    enable_tuning: Optional[bool] = None


class RetrainModelsRequest(BaseModel):
    branch_id: int = Field(..., ge=1)
    train_iforest: bool = True
    train_forecast: bool = True
    algorithm: Optional[str] = None  # default in settings if None
    target_metric: Optional[str] = None  # default in settings if None
    iforest_params: Optional[IForestTrainParams] = None
    forecast_params: Optional[ForecastTrainParams] = None


class TestForecastRequest(BaseModel):
    branch_id: int = Field(..., ge=1)
    algorithm: str = Field("PROPHET")
    target_metric: str = Field("order_count")
    test_days: int = Field(14, ge=5, le=120)


class TestIForestRequest(BaseModel):
    branch_id: int = Field(..., ge=1)
    test_days: int = Field(30, ge=5, le=365)


class ModelInfo(BaseModel):
    id: Optional[int] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    model_type: Optional[str] = None
    trained_at: Optional[str] = None
    training_data_start_date: Optional[str] = None
    training_data_end_date: Optional[str] = None
    training_samples_count: Optional[int] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    feature_list: Optional[List[str]] = None
    is_active: Optional[bool] = None
    # Optional quality scoring (computed on request, not stored)
    quality_metric: Optional[str] = None  # e.g. "mae" or "separation"
    quality_value: Optional[float] = None  # raw value (mae lower is better; separation higher is better)
    quality_score: Optional[float] = None  # normalized so that higher is better (for sorting)
    quality_note: Optional[str] = None


class ModelStatusResponse(BaseModel):
    success: bool = True
    branch_id: int
    iforest_model: Optional[ModelInfo] = None
    forecast_model: Optional[ModelInfo] = None


class ModelHistoryResponse(BaseModel):
    success: bool = True
    branch_id: int
    model_name: str
    total: int
    items: List[ModelInfo]
    best_model_id: Optional[int] = None


class ModelByIdResponse(BaseModel):
    success: bool = True
    model: ModelInfo


