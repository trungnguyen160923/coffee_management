"""
Service for managing AI reports in database
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, date
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportUpdate
import logging

logger = logging.getLogger(__name__)


class ReportService:
    """Service to manage reports in database"""
    
    def create_report(
        self,
        db: Session,
        report_data: ReportCreate
    ) -> Report:
        """
        Create a new report in database
        """
        try:
            db_report = Report(
                branch_id=report_data.branch_id,
                report_date=report_data.report_date,
                tool_type=report_data.tool_type,
                analysis=report_data.analysis,
                summary=report_data.summary,
                recommendations=report_data.recommendations,
                raw_data=report_data.raw_data,
                query=report_data.query,
                ai_model=report_data.ai_model,
                processing_time_ms=report_data.processing_time_ms
            )
            db.add(db_report)
            db.commit()
            db.refresh(db_report)
            logger.info(f"Report created: ID={db_report.id}, Branch={db_report.branch_id}, Date={db_report.report_date}")
            return db_report
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating report: {e}", exc_info=True)
            raise
    
    def get_report_by_id(
        self,
        db: Session,
        report_id: int
    ) -> Optional[Report]:
        """
        Get report by ID
        """
        try:
            return db.query(Report).filter(Report.id == report_id).first()
        except Exception as e:
            logger.error(f"Error getting report by ID: {e}", exc_info=True)
            return None
    
    def get_reports_by_branch(
        self,
        db: Session,
        branch_id: int,
        limit: int = 10,
        offset: int = 0
    ) -> List[Report]:
        """
        Get reports for a specific branch, ordered by date (newest first)
        """
        try:
            return db.query(Report)\
                .filter(Report.branch_id == branch_id)\
                .order_by(desc(Report.report_date))\
                .limit(limit)\
                .offset(offset)\
                .all()
        except Exception as e:
            logger.error(f"Error getting reports by branch: {e}", exc_info=True)
            return []
    
    def get_report_by_branch_and_date(
        self,
        db: Session,
        branch_id: int,
        report_date: date
    ) -> Optional[Report]:
        """
        Get report for a specific branch and date
        """
        try:
            # Convert date to datetime for comparison
            start_of_day = datetime.combine(report_date, datetime.min.time())
            end_of_day = datetime.combine(report_date, datetime.max.time())
            
            return db.query(Report)\
                .filter(
                    Report.branch_id == branch_id,
                    Report.report_date >= start_of_day,
                    Report.report_date <= end_of_day
                )\
                .order_by(desc(Report.created_at))\
                .first()
        except Exception as e:
            logger.error(f"Error getting report by branch and date: {e}", exc_info=True)
            return None
    
    def update_report(
        self,
        db: Session,
        report_id: int,
        update_data: ReportUpdate
    ) -> Optional[Report]:
        """
        Update report (e.g., mark as sent)
        """
        try:
            db_report = self.get_report_by_id(db, report_id)
            if not db_report:
                return None
            
            if update_data.is_sent is not None:
                db_report.is_sent = update_data.is_sent
                if update_data.is_sent and not db_report.sent_at:
                    db_report.sent_at = datetime.now()
            
            if update_data.sent_at is not None:
                db_report.sent_at = update_data.sent_at
            
            db.commit()
            db.refresh(db_report)
            logger.info(f"Report updated: ID={db_report.id}, is_sent={db_report.is_sent}")
            return db_report
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating report: {e}", exc_info=True)
            return None
    
    def get_unsent_reports(
        self,
        db: Session,
        branch_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Report]:
        """
        Get reports that haven't been sent yet
        """
        try:
            query = db.query(Report).filter(Report.is_sent == False)
            
            if branch_id:
                query = query.filter(Report.branch_id == branch_id)
            
            return query.order_by(desc(Report.created_at)).limit(limit).all()
        except Exception as e:
            logger.error(f"Error getting unsent reports: {e}", exc_info=True)
            return []
    
    def delete_report(
        self,
        db: Session,
        report_id: int
    ) -> bool:
        """
        Delete a report
        """
        try:
            db_report = self.get_report_by_id(db, report_id)
            if not db_report:
                return False
            
            db.delete(db_report)
            db.commit()
            logger.info(f"Report deleted: ID={report_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting report: {e}", exc_info=True)
            return False

