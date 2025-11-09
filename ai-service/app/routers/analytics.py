"""
API Routes for Analytics and Anomaly Detection
"""
from fastapi import APIRouter, HTTPException, Query
from datetime import date
from typing import Optional
from app.services.anomaly_service import AnomalyService
from app.services.data_collector import DataCollectorService
from app.schemas.anomaly import (
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    ModelTrainingRequest,
    ModelTrainingResponse
)
from app.schemas.metrics import DailyBranchMetrics
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Analytics"])

# Initialize services
anomaly_service = AnomalyService()
data_collector = DataCollectorService()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Analytics Service"}


@router.post("/anomaly/detect", response_model=AnomalyDetectionResponse)
async def detect_anomaly(request: AnomalyDetectionRequest):
    """
    Detect anomaly for a branch on a specific date
    """
    try:
        result = await anomaly_service.detect_anomaly(
            branch_id=request.branch_id,
            target_date=request.date
        )
        
        if result is None:
            return AnomalyDetectionResponse(
                success=False,
                message="Failed to detect anomaly. Model may not be trained or data unavailable."
            )
        
        return AnomalyDetectionResponse(
            success=True,
            result=result
        )
        
    except Exception as e:
        logger.error(f"Error in detect_anomaly endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomaly/detect", response_model=AnomalyDetectionResponse)
async def detect_anomaly_get(
    branch_id: int = Query(..., description="Branch ID"),
    date: date = Query(..., description="Date to analyze")
):
    """
    Detect anomaly for a branch on a specific date (GET version)
    """
    request = AnomalyDetectionRequest(branch_id=branch_id, date=date)
    return await detect_anomaly(request)


@router.post("/model/train", response_model=ModelTrainingResponse)
async def train_model(request: ModelTrainingRequest):
    """
    Train anomaly detection model for a branch
    """
    try:
        success = await anomaly_service.train_model(
            branch_id=request.branch_id,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        if not success:
            return ModelTrainingResponse(
                success=False,
                message="Failed to train model. Insufficient data or training error."
            )
        
        model_name = request.model_name or f"iforest_anomaly_branch_{request.branch_id}"
        
        return ModelTrainingResponse(
            success=True,
            model_name=model_name,
            training_samples=None,  # TODO: Return actual count
            message="Model trained successfully"
        )
        
    except Exception as e:
        logger.error(f"Error in train_model endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/collect")
async def collect_metrics(
    branch_id: int = Query(..., description="Branch ID"),
    date: date = Query(..., description="Date to collect metrics")
) -> DailyBranchMetrics:
    """
    Collect daily metrics for a branch
    """
    try:
        metrics = await data_collector.collect_daily_metrics(branch_id, date)
        
        if metrics is None:
            raise HTTPException(
                status_code=404,
                detail=f"Failed to collect metrics for branch {branch_id} on {date}"
            )
        
        return metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in collect_metrics endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

