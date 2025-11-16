"""
API Routes for report distribution
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.services.distribution_service import DistributionService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/distribution", tags=["Report Distribution"])

# Initialize service
distribution_service = DistributionService()


@router.post("/send/{report_id}")
async def send_report(
    report_id: int,
    manager_emails: Optional[List[str]] = Query(None, description="List of manager emails (optional)"),
    db: Session = Depends(get_db)
):
    """
    Send a specific report to manager(s) via email
    """
    result = await distribution_service.send_report_to_manager(
        db, report_id, manager_emails
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/send-unsent")
async def send_unsent_reports(
    branch_id: Optional[int] = Query(None, description="Optional branch ID filter"),
    manager_emails: Optional[List[str]] = Query(None, description="List of manager emails (optional)"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of reports to send"),
    db: Session = Depends(get_db)
):
    """
    Send all unsent reports to managers
    Useful for scheduled jobs or manual triggers
    """
    result = await distribution_service.send_unsent_reports(
        db, branch_id, manager_emails, limit
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/status")
async def get_distribution_status(
    db: Session = Depends(get_db)
):
    """
    Get distribution status (count of sent/unsent reports)
    """
    from app.services.report_service import ReportService
    from sqlalchemy import func
    from app.models.report import Report
    
    report_service = ReportService()
    
    try:
        # Get counts
        total_reports = db.query(func.count(Report.id)).scalar() or 0
        sent_reports = db.query(func.count(Report.id)).filter(Report.is_sent == True).scalar() or 0
        unsent_reports = db.query(func.count(Report.id)).filter(Report.is_sent == False).scalar() or 0
        
        # Get unsent reports list
        unsent_list = report_service.get_unsent_reports(db, None, limit=10)
        
        return {
            "total_reports": total_reports,
            "sent_reports": sent_reports,
            "unsent_reports": unsent_reports,
            "recent_unsent": [
                {
                    "id": r.id,
                    "branch_id": r.branch_id,
                    "report_date": r.report_date.isoformat(),
                    "created_at": r.created_at.isoformat()
                }
                for r in unsent_list
            ]
        }
    except Exception as e:
        logger.error(f"Error getting distribution status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

