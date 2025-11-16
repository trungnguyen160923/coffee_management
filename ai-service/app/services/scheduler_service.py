"""
Scheduler service for automated report generation and distribution
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Optional
from app.database import SessionLocal
from app.services.ai_agent_service import AIAgentService
from app.services.distribution_service import DistributionService
from app.services.report_service import ReportService
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service to schedule automated tasks"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.ai_agent_service = AIAgentService()
        self.distribution_service = DistributionService()
        self.report_service = ReportService()
        self._is_running = False
    
    def start(self):
        """Start the scheduler"""
        if not self._is_running:
            # Schedule daily report generation and distribution
            # Run at 23:00 every day (after business hours)
            self.scheduler.add_job(
                self.generate_and_send_daily_reports,
                trigger=CronTrigger(hour=23, minute=0),
                id='daily_reports',
                name='Generate and send daily AI reports',
                replace_existing=True
            )
            
            self.scheduler.start()
            self._is_running = True
            logger.info("Scheduler started - Daily reports will be generated at 23:00")
        else:
            logger.warning("Scheduler is already running")
    
    def stop(self):
        """Stop the scheduler"""
        if self._is_running:
            self.scheduler.shutdown()
            self._is_running = False
            logger.info("Scheduler stopped")
    
    async def generate_and_send_daily_reports(
        self,
        target_date: Optional[date] = None,
        branch_ids: Optional[List[int]] = None
    ):
        """
        Generate reports for yesterday (or specified date) and send to managers
        
        Args:
            target_date: Date to generate reports for (default: yesterday)
            branch_ids: List of branch IDs to process (default: all branches)
        """
        if target_date is None:
            # Default to yesterday
            target_date = date.today() - timedelta(days=1)
        
        if branch_ids is None:
            # Default: process branch 1 (can be extended to get all branches)
            branch_ids = [1]
        
        db: Session = SessionLocal()
        try:
            results = []
            
            for branch_id in branch_ids:
                try:
                    # Check if report already exists for this date
                    existing_report = self.report_service.get_report_by_branch_and_date(
                        db, branch_id, target_date
                    )
                    
                    if existing_report:
                        logger.info(f"Report already exists for branch {branch_id} on {target_date}")
                        # Send existing report if not sent
                        if not existing_report.is_sent:
                            send_result = await self.distribution_service.send_report_to_manager(
                                db, existing_report.id, None
                            )
                            results.append({
                                "branch_id": branch_id,
                                "date": target_date.isoformat(),
                                "action": "sent_existing",
                                "report_id": existing_report.id,
                                "result": send_result
                            })
                        else:
                            results.append({
                                "branch_id": branch_id,
                                "date": target_date.isoformat(),
                                "action": "already_sent",
                                "report_id": existing_report.id
                            })
                        continue
                    
                    # Generate new report
                    logger.info(f"Generating report for branch {branch_id} on {target_date}")
                    
                    # 1. Collect data
                    aggregated_data = await self.ai_agent_service.collect_three_json_data(
                        branch_id=branch_id,
                        target_date=target_date
                    )
                    
                    # 2. Process with AI
                    ai_result = await self.ai_agent_service.process_with_ai(
                        aggregated_data=aggregated_data,
                        query=None,
                        tool_type="tool1"
                    )
                    
                    if not ai_result.get("success"):
                        logger.error(f"Failed to generate AI analysis for branch {branch_id}")
                        results.append({
                            "branch_id": branch_id,
                            "date": target_date.isoformat(),
                            "action": "failed",
                            "error": ai_result.get("message", "Unknown error")
                        })
                        continue
                    
                    # 3. Save to database
                    from app.schemas.report import ReportCreate
                    from datetime import datetime
                    import time
                    
                    report_create = ReportCreate(
                        branch_id=branch_id,
                        report_date=datetime.combine(target_date, datetime.min.time()),
                        tool_type="tool1",
                        analysis=ai_result.get("analysis", ""),
                        summary=ai_result.get("summary"),
                        recommendations=ai_result.get("recommendations"),
                        raw_data=aggregated_data,
                        query=None,
                        ai_model=settings.OPENAI_MODEL,
                        processing_time_ms=None  # Can be calculated if needed
                    )
                    
                    db_report = self.report_service.create_report(db, report_create)
                    logger.info(f"Report created: ID={db_report.id} for branch {branch_id}")
                    
                    # 4. Send to managers
                    send_result = await self.distribution_service.send_report_to_manager(
                        db, db_report.id, None
                    )
                    
                    results.append({
                        "branch_id": branch_id,
                        "date": target_date.isoformat(),
                        "action": "generated_and_sent",
                        "report_id": db_report.id,
                        "send_result": send_result
                    })
                    
                except Exception as e:
                    logger.error(f"Error processing branch {branch_id}: {e}", exc_info=True)
                    results.append({
                        "branch_id": branch_id,
                        "date": target_date.isoformat(),
                        "action": "error",
                        "error": str(e)
                    })
            
            logger.info(f"Daily report generation completed: {len(results)} branches processed")
            return {
                "success": True,
                "date": target_date.isoformat(),
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Error in generate_and_send_daily_reports: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            db.close()
    
    async def send_unsent_reports_job(self):
        """Job to send all unsent reports"""
        db: Session = SessionLocal()
        try:
            result = await self.distribution_service.send_unsent_reports(
                db, None, None, limit=100
            )
            logger.info(f"Unsent reports job completed: {result}")
            return result
        finally:
            db.close()

