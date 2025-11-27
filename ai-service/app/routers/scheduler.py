"""
API Routes for scheduler management
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from app.database import get_db
from app.services.scheduler_service import SchedulerService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/scheduler", tags=["Scheduler"])

# Scheduler service will be injected from main app
# We'll use a function to get it to avoid circular import
def get_scheduler_service():
    """Get scheduler service instance from main app"""
    from app.main import scheduler_service
    return scheduler_service


@router.post("/start")
async def start_scheduler():
    """
    Start the scheduler (if not already running)
    """
    try:
        service = get_scheduler_service()
        service.start()
        return {
            "success": True,
            "message": "Scheduler started successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_scheduler():
    """
    Stop the scheduler
    """
    try:
        service = get_scheduler_service()
        service.stop()
        return {
            "success": True,
            "message": "Scheduler stopped successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_scheduler_status():
    """
    Get scheduler status
    """
    service = get_scheduler_service()
    return {
        "running": service._is_running,
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": str(job.next_run_time) if job.next_run_time else None
            }
            for job in service.scheduler.get_jobs()
        ]
    }


@router.post("/trigger/daily-reports")
async def trigger_daily_reports(
    target_date: Optional[date] = Query(None, description="Date to generate reports for (default: yesterday)"),
    branch_ids: Optional[List[int]] = Query(None, description="List of branch IDs (default: [1])"),
    db: Session = Depends(get_db)
):
    """
    Manually trigger daily report generation and distribution
    """
    try:
        service = get_scheduler_service()
        result = await service.generate_and_send_daily_reports(
            target_date=target_date,
            branch_ids=branch_ids
        )
        return result
    except Exception as e:
        logger.error(f"Error triggering daily reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger/daily-metrics")
async def trigger_daily_metrics(
    target_date: Optional[date] = Query(None, description="Date to aggregate metrics for"),
    branch_ids: Optional[List[int]] = Query(None, description="List of branch IDs (default: all)"),
):
    """
    Manually trigger daily metrics aggregation job
    """
    try:
        service = get_scheduler_service()
        result = await service.run_daily_metrics_job(
            target_date=target_date,
            branch_ids=branch_ids
        )
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Metrics job failed"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering daily metrics job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger/retrain-models")
async def trigger_model_retraining(
    branch_ids: Optional[List[int]] = Query(None, description="Subset of branch IDs; default all"),
    target_metric: Optional[str] = Query(None, description="Override target metric for forecast training"),
    algorithm: Optional[str] = Query(None, description="Override forecasting algorithm (default Prophet)")
):
    """
    Manually trigger weekly ML model retraining job
    """
    try:
        service = get_scheduler_service()
        result = await service.run_model_retraining_job(
            branch_ids=branch_ids,
            target_metric=target_metric,
            algorithm=algorithm
        )
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Retraining job failed"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering model retraining job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger/send-unsent")
async def trigger_send_unsent(
    db: Session = Depends(get_db)
):
    """
    Manually trigger sending all unsent reports
    """
    try:
        service = get_scheduler_service()
        result = await service.send_unsent_reports_job()
        return result
    except Exception as e:
        logger.error(f"Error sending unsent reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

