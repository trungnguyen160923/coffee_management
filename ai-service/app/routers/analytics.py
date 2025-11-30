"""
API Routes for Analytics and Anomaly Detection
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from datetime import date, datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.services.anomaly_service import AnomalyService
from app.services.data_collector import DataCollectorService
from app.services.metrics_query_service import MetricsQueryService
from app.services.ai_agent_service import AIAgentService
from app.schemas.anomaly import (
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    ModelTrainingRequest,
    ModelTrainingResponse
)
from app.schemas.metrics import DailyBranchMetrics
from app.schemas.metrics_query import (
    DailyTotalRevenueResponse,
    BranchCountResponse,
    YearlyRevenueOrdersResponse,
    MonthlyTopBranchesResponse,
    ComprehensiveMetricsResponse
)
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Analytics"])

# Initialize services
anomaly_service = AnomalyService()
data_collector = DataCollectorService()
metrics_query_service = MetricsQueryService()
ai_agent_service = AIAgentService()


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


@router.get("/metrics/daily/total-revenue", response_model=DailyTotalRevenueResponse)
async def get_daily_total_revenue(
    target_date: Optional[date] = Query(None, description="Date to query (default: today)"),
    db: Session = Depends(get_db)
):
    """
    Get total revenue across all branches for a specific date
    
    - **target_date**: Date to query (defaults to today if not provided)
    - Returns: Total revenue, branch count, and average revenue per branch
    """
    try:
        result = metrics_query_service.get_daily_total_revenue(db, target_date)
        return DailyTotalRevenueResponse(**result)
    except Exception as e:
        logger.error(f"Error getting daily total revenue: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/branches/count", response_model=BranchCountResponse)
async def get_branch_count(db: Session = Depends(get_db)):
    """
    Get total number of branches
    
    Returns the count of branches that have metrics data in the system.
    """
    try:
        result = metrics_query_service.get_branch_count(db)
        return BranchCountResponse(**result)
    except Exception as e:
        logger.error(f"Error getting branch count: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/yearly/revenue-orders", response_model=YearlyRevenueOrdersResponse)
async def get_yearly_revenue_orders(
    year: Optional[int] = Query(None, description="Year to query (default: current year)"),
    db: Session = Depends(get_db)
):
    """
    Get revenue and orders breakdown by month for a specific year
    
    - **year**: Year to query (defaults to current year if not provided)
    - Returns: Yearly totals and monthly breakdown with revenue and order counts
    """
    try:
        result = metrics_query_service.get_yearly_revenue_orders(db, year)
        return YearlyRevenueOrdersResponse(**result)
    except Exception as e:
        logger.error(f"Error getting yearly revenue orders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/monthly/top-branches", response_model=MonthlyTopBranchesResponse)
async def get_monthly_top_branches(
    year: Optional[int] = Query(None, description="Year to query (default: current year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month to query (1-12, default: current month)"),
    limit: int = Query(10, ge=1, le=100, description="Number of top branches to return"),
    db: Session = Depends(get_db)
):
    """
    Get top performing branches by revenue for a specific month
    
    - **year**: Year to query (defaults to current year if not provided)
    - **month**: Month to query (1-12, defaults to current month if not provided)
    - **limit**: Number of top branches to return (default: 10, max: 100)
    - Returns: List of top branches ranked by revenue with order counts and average order values
    """
    try:
        result = metrics_query_service.get_monthly_top_branches(db, year, month, limit)
        return MonthlyTopBranchesResponse(**result)
    except Exception as e:
        logger.error(f"Error getting monthly top branches: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/comprehensive", response_model=ComprehensiveMetricsResponse)
async def get_comprehensive_metrics(
    target_date: Optional[date] = Query(None, description="Date for daily revenue (default: today)"),
    year: Optional[int] = Query(None, description="Year for yearly and monthly data (default: current year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month for top branches (1-12, default: current month)"),
    top_branches_limit: int = Query(10, ge=1, le=100, description="Number of top branches to return"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive metrics combining all metrics data
    
    This endpoint returns:
    1. Total revenue across all branches for a specific date
    2. Total number of branches
    3. Yearly revenue and orders breakdown by month
    4. Top performing branches by revenue for a specific month
    
    - **target_date**: Date for daily revenue query (defaults to today if not provided)
    - **year**: Year for yearly revenue/orders and monthly top branches (defaults to current year)
    - **month**: Month for top branches query (1-12, defaults to current month)
    - **top_branches_limit**: Number of top branches to return (default: 10, max: 100)
    
    Returns: Comprehensive metrics combining all data in a single response
    """
    try:
        result = metrics_query_service.get_comprehensive_metrics(
            db, target_date, year, month, top_branches_limit
        )
        
        # Create nested response objects
        return ComprehensiveMetricsResponse(
            daily_revenue=DailyTotalRevenueResponse(**result["daily_revenue"]),
            branch_count=BranchCountResponse(**result["branch_count"]),
            yearly_revenue_orders=YearlyRevenueOrdersResponse(**result["yearly_revenue_orders"]),
            monthly_top_branches=MonthlyTopBranchesResponse(**result["monthly_top_branches"])
        )
    except Exception as e:
        logger.error(f"Error getting comprehensive metrics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collect-data")
async def collect_data(
    branch_id: int = Query(..., description="Branch ID"),
    date: date = Query(..., description="Date to collect data")
):
    """
    Chỉ thu thập dữ liệu từ các service cho 1 chi nhánh (6 API + 2 ML predictions, không xử lý AI)
    Dùng để test hoặc debug
    Alias endpoint cho /api/ai/agent/collect-data
    """
    try:
        aggregated_data = await ai_agent_service.collect_three_json_data(
            branch_id=branch_id,
            target_date=date
        )
        return {
            "success": True,
            "data": aggregated_data
        }
    except Exception as e:
        logger.error(f"Error in collect_data endpoint: {e}", exc_info=True)


