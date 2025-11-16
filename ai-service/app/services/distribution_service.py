"""
Distribution service for sending AI reports to managers
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.services.report_service import ReportService
from app.services.email_service import EmailService
from app.models.report import Report
from app.schemas.report import ReportUpdate
import logging

logger = logging.getLogger(__name__)


class DistributionService:
    """Service to distribute reports to managers"""
    
    def __init__(self):
        self.report_service = ReportService()
        self.email_service = EmailService()
    
    async def send_report_to_manager(
        self,
        db: Session,
        report_id: int,
        manager_emails: Optional[List[str]] = None
    ) -> dict:
        """
        Send a specific report to manager(s)
        
        Args:
            db: Database session
            report_id: Report ID to send
            manager_emails: List of manager emails (if None, uses default from config)
        
        Returns:
            dict with success status and message
        """
        try:
            # Get report from database
            report = self.report_service.get_report_by_id(db, report_id)
            if not report:
                return {
                    "success": False,
                    "message": f"Report {report_id} not found"
                }
            
            # Check if already sent
            if report.is_sent:
                return {
                    "success": False,
                    "message": f"Report {report_id} has already been sent"
                }
            
            # Get manager emails
            if not manager_emails:
                from app.config import settings
                if settings.MANAGER_EMAIL:
                    manager_emails = [settings.MANAGER_EMAIL]
                else:
                    return {
                        "success": False,
                        "message": "No manager email configured"
                    }
            
            # Send email
            email_sent = await self.email_service.send_report_email(
                to_emails=manager_emails,
                branch_id=report.branch_id,
                report_date=report.report_date.strftime("%Y-%m-%d"),
                analysis=report.analysis,
                summary=report.summary,
                recommendations=report.recommendations,
                report_id=report.id
            )
            
            if email_sent:
                # Mark report as sent
                update_data = ReportUpdate(
                    is_sent=True,
                    sent_at=datetime.now()
                )
                self.report_service.update_report(db, report_id, update_data)
                
                return {
                    "success": True,
                    "message": f"Report {report_id} sent successfully to {manager_emails}",
                    "sent_to": manager_emails
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to send email. Check email configuration."
                }
                
        except Exception as e:
            logger.error(f"Error sending report to manager: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    async def send_unsent_reports(
        self,
        db: Session,
        branch_id: Optional[int] = None,
        manager_emails: Optional[List[str]] = None,
        limit: int = 10
    ) -> dict:
        """
        Send all unsent reports to managers
        
        Args:
            db: Database session
            branch_id: Optional branch ID filter
            manager_emails: List of manager emails
            limit: Maximum number of reports to send
        
        Returns:
            dict with results
        """
        try:
            # Get unsent reports
            unsent_reports = self.report_service.get_unsent_reports(
                db, branch_id, limit
            )
            
            if not unsent_reports:
                return {
                    "success": True,
                    "message": "No unsent reports found",
                    "sent_count": 0,
                    "failed_count": 0
                }
            
            # Get manager emails
            if not manager_emails:
                from app.config import settings
                if settings.MANAGER_EMAIL:
                    manager_emails = [settings.MANAGER_EMAIL]
                else:
                    return {
                        "success": False,
                        "message": "No manager email configured"
                    }
            
            # Send each report
            sent_count = 0
            failed_count = 0
            failed_reports = []
            
            for report in unsent_reports:
                result = await self.send_report_to_manager(
                    db, report.id, manager_emails
                )
                if result["success"]:
                    sent_count += 1
                else:
                    failed_count += 1
                    failed_reports.append({
                        "report_id": report.id,
                        "error": result["message"]
                    })
            
            return {
                "success": True,
                "message": f"Processed {len(unsent_reports)} reports",
                "sent_count": sent_count,
                "failed_count": failed_count,
                "failed_reports": failed_reports
            }
            
        except Exception as e:
            logger.error(f"Error sending unsent reports: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }

