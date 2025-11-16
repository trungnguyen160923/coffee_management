"""
API Routes for managing AI reports
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime
from app.database import get_db
from app.services.report_service import ReportService
from app.schemas.report import (
    ReportResponse,
    ReportListResponse,
    ReportUpdate
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/reports", tags=["AI Reports"])

# Initialize service
report_service = ReportService()


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific report by ID
    """
    report = report_service.get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/branch/{branch_id}", response_model=ReportListResponse)
async def get_reports_by_branch(
    branch_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get all reports for a specific branch (paginated)
    """
    offset = (page - 1) * page_size
    reports = report_service.get_reports_by_branch(
        db, branch_id, limit=page_size, offset=offset
    )
    
    # Get total count
    total = len(report_service.get_reports_by_branch(db, branch_id, limit=10000, offset=0))
    
    return ReportListResponse(
        reports=reports,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/branch/{branch_id}/date/{report_date}", response_model=ReportResponse)
async def get_report_by_date(
    branch_id: int,
    report_date: date,
    db: Session = Depends(get_db)
):
    """
    Get report for a specific branch and date
    """
    report = report_service.get_report_by_branch_and_date(
        db, branch_id, report_date
    )
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report not found for branch {branch_id} on {report_date}"
        )
    return report


@router.get("/unsent/list", response_model=ReportListResponse)
async def get_unsent_reports(
    branch_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Get all unsent reports (for distribution service)
    """
    reports = report_service.get_unsent_reports(db, branch_id, limit)
    return ReportListResponse(
        reports=reports,
        total=len(reports),
        page=1,
        page_size=len(reports)
    )


@router.patch("/{report_id}/mark-sent", response_model=ReportResponse)
async def mark_report_as_sent(
    report_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a report as sent (for distribution tracking)
    """
    update_data = ReportUpdate(is_sent=True, sent_at=datetime.now())
    report = report_service.update_report(db, report_id, update_data)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a report
    """
    success = report_service.delete_report(db, report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted successfully"}

