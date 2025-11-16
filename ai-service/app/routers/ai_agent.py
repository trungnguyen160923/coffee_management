"""
API Routes for AI Agent
Tổng hợp 3 JSON từ các service và xử lý với AI
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import Optional
import time
from app.services.ai_agent_service import AIAgentService
from app.services.report_service import ReportService
from app.schemas.ai_agent import AIAgentRequest, AIAgentResponse
from app.schemas.report import ReportCreate
from app.database import get_db
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/agent", tags=["AI Agent"])

# Initialize services
ai_agent_service = AIAgentService()
report_service = ReportService()


@router.post("/analyze", response_model=AIAgentResponse)
async def analyze_with_ai(
    request: AIAgentRequest,
    db: Session = Depends(get_db),
    save_to_db: bool = Query(True, description="Save report to database")
):
    """
    Phân tích dữ liệu với AI Agent
    - Thu thập 6 API từ order-service và catalog-service
    - Tổng hợp thành context
    - Xử lý với LangChain + OpenAI GPT-4o
    - Lưu báo cáo vào database (nếu save_to_db=True)
    """
    start_time = time.time()
    try:
        # 1. Thu thập 6 API từ các service
        aggregated_data = await ai_agent_service.collect_three_json_data(
            branch_id=request.branch_id,
            target_date=request.date
        )
        
        # 2. Xử lý với AI
        ai_result = await ai_agent_service.process_with_ai(
            aggregated_data=aggregated_data,
            query=request.query,
            tool_type=request.tool_type
        )
        
        if not ai_result.get("success"):
            return AIAgentResponse(
                success=False,
                branch_id=request.branch_id,
                date=request.date,
                analysis="",
                message=ai_result.get("message", "Failed to process with AI")
            )
        
        # 3. Tính thời gian xử lý
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # 4. Lưu báo cáo vào database (nếu được yêu cầu)
        report_id = None
        if save_to_db:
            try:
                report_create = ReportCreate(
                    branch_id=request.branch_id,
                    report_date=datetime.combine(request.date, datetime.min.time()),
                    tool_type=request.tool_type,
                    analysis=ai_result.get("analysis", ""),
                    summary=ai_result.get("summary"),
                    recommendations=ai_result.get("recommendations"),
                    raw_data=aggregated_data,
                    query=request.query,
                    ai_model=settings.OPENAI_MODEL,
                    processing_time_ms=processing_time_ms
                )
                db_report = report_service.create_report(db, report_create)
                report_id = db_report.id
                logger.info(f"Report saved to database: ID={report_id}")
            except Exception as db_error:
                logger.error(f"Error saving report to database: {db_error}", exc_info=True)
                # Không fail request nếu lưu DB lỗi, chỉ log
        
        # 5. Trả về response
        response = AIAgentResponse(
            success=True,
            branch_id=request.branch_id,
            date=request.date,
            analysis=ai_result.get("analysis", ""),
            summary=ai_result.get("summary"),
            recommendations=ai_result.get("recommendations"),
            raw_data=aggregated_data,
            message=f"Analysis completed successfully. Report ID: {report_id}" if report_id else "Analysis completed successfully"
        )
        return response
        
    except Exception as e:
        logger.error(f"Error in analyze_with_ai endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze", response_model=AIAgentResponse)
async def analyze_with_ai_get(
    branch_id: int = Query(..., description="Branch ID to analyze"),
    date: date = Query(..., description="Date to analyze"),
    query: Optional[str] = Query(None, description="Optional specific query/question"),
    tool_type: Optional[str] = Query(None, description="Type of tool: 'tool1' or 'tool3'"),
    save_to_db: bool = Query(True, description="Save report to database"),
    db: Session = Depends(get_db)
):
    """
    Phân tích dữ liệu với AI Agent (GET version)
    """
    request = AIAgentRequest(
        branch_id=branch_id,
        date=date,
        query=query,
        tool_type=tool_type
    )
    return await analyze_with_ai(request, db=db, save_to_db=save_to_db)


@router.get("/collect-data")
async def collect_data_only(
    branch_id: int = Query(..., description="Branch ID"),
    date: date = Query(..., description="Date to collect data")
):
    """
    Chỉ thu thập 3 JSON từ các service (không xử lý AI)
    Dùng để test hoặc debug
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
        logger.error(f"Error in collect_data_only endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

