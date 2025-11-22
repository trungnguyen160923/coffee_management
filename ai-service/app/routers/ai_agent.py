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
from app.schemas.ai_agent import (
    AIAgentRequest, 
    AIAgentResponse,
    AllBranchesAIAgentRequest,
    AllBranchesAIAgentResponse
)
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
    Chỉ thu thập dữ liệu từ các service cho 1 chi nhánh (6 API + 2 ML predictions, không xử lý AI)
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


@router.get("/collect-all-data")
async def collect_all_branches_data_only(
    date: date = Query(..., description="Date to collect data for all branches")
):
    """
    Chỉ thu thập dữ liệu từ các service cho TẤT CẢ chi nhánh (6 API mới, không xử lý AI)
    Dùng để test hoặc debug
    Trả về thống kê tổng hợp của tất cả chi nhánh
    """
    try:
        aggregated_data = await ai_agent_service.collect_all_branches_data(
            target_date=date
        )
        return {
            "success": True,
            "data": aggregated_data
        }
    except Exception as e:
        logger.error(f"Error in collect_all_branches_data_only endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze-all/report")
async def get_admin_report_from_db(
    date: date = Query(..., description="Date to get report"),
    db: Session = Depends(get_db)
):
    """
    Lấy admin report từ database (không gọi AI)
    Trả về report đã có sẵn trong database cho ngày cụ thể
    """
    try:
        report = report_service.get_admin_report_by_date(db, date)
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"No report found for date {date}. Please generate a new report first."
            )
        
        # Convert Report model to AllBranchesAIAgentResponse format
        return AllBranchesAIAgentResponse(
            success=True,
            date=report.report_date.date(),
            analysis=report.analysis,
            summary=report.summary,
            recommendations=report.recommendations,
            raw_data=report.raw_data,
            message=f"Report loaded from database. ID: {report.id}, Created at: {report.created_at}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin report from database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-all", response_model=AllBranchesAIAgentResponse)
async def analyze_all_branches_with_ai(
    request: Optional[AllBranchesAIAgentRequest] = None,
    date: Optional[date] = Query(None, description="Date to analyze (alternative to body)"),
    query: Optional[str] = Query(None, description="Optional specific query/question (alternative to body)"),
    db: Session = Depends(get_db),
    save_to_db: bool = Query(True, description="Save report to database"),
    force_refresh: bool = Query(False, description="Force refresh - ignore existing report in database")
):
    """
    Phân tích dữ liệu TẤT CẢ chi nhánh với AI Agent (dành cho Admin)
    - Kiểm tra database trước, nếu có report thì trả về luôn (tránh gọi AI nhiều lần)
    - Nếu force_refresh=True hoặc không có trong DB thì mới gọi AI
    - Thu thập 6 API từ order-service cho tất cả chi nhánh
    - Tổng hợp thành context
    - Xử lý với LangChain + OpenAI GPT-4o
    - Đánh giá tình hình từng chi nhánh và so sánh giữa các chi nhánh
    
    Có thể gọi với:
    - Body JSON: {"date": "2025-11-09", "query": "..."}
    - Query parameters: ?date=2025-11-09&query=...&force_refresh=false
    """
    start_time = time.time()
    try:
        # Xử lý request: ưu tiên body, nếu không có thì dùng query params
        if request:
            target_date = request.date
            target_query = request.query
        elif date:
            target_date = date
            target_query = query
        else:
            raise HTTPException(
                status_code=422,
                detail="Either request body or 'date' query parameter is required"
            )
        
        # 1. Kiểm tra database trước (nếu không force refresh)
        if not force_refresh:
            existing_report = report_service.get_admin_report_by_date(db, target_date)
            if existing_report:
                logger.info(f"Found existing report in database for date {target_date}, ID: {existing_report.id}")
                return AllBranchesAIAgentResponse(
                    success=True,
                    date=existing_report.report_date.date(),
                    analysis=existing_report.analysis,
                    summary=existing_report.summary,
                    recommendations=existing_report.recommendations,
                    raw_data=existing_report.raw_data,
                    message=f"Report loaded from database (ID: {existing_report.id}). Use force_refresh=true to regenerate."
                )
        
        # 2. Nếu không có trong DB hoặc force_refresh, thu thập dữ liệu và gọi AI
        logger.info(f"{'Force refresh' if force_refresh else 'No existing report found'}, generating new AI analysis for date {target_date}")
        
        # Thu thập 6 API từ các service cho tất cả chi nhánh
        aggregated_data = await ai_agent_service.collect_all_branches_data(
            target_date=target_date
        )
        
        # 2. Xử lý với AI
        ai_result = await ai_agent_service.process_all_branches_with_ai(
            aggregated_data=aggregated_data,
            query=target_query
        )
        
        if not ai_result.get("success"):
            return AllBranchesAIAgentResponse(
                success=False,
                date=target_date,
                analysis="",
                message=ai_result.get("message", "Failed to process with AI")
            )
        
        # 3. Tính thời gian xử lý
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # 4. Lưu báo cáo vào database (nếu được yêu cầu)
        report_id = None
        if save_to_db:
            try:
                # Use branch_id=0 to represent "all branches" admin report
                report_create = ReportCreate(
                    branch_id=0,  # 0 = all branches (admin report)
                    report_date=datetime.combine(target_date, datetime.min.time()),
                    tool_type="admin_all_branches",  # Special tool type for admin reports
                    analysis=ai_result.get("analysis", ""),
                    summary=ai_result.get("summary"),
                    recommendations=ai_result.get("recommendations"),
                    raw_data=aggregated_data,
                    query=target_query,
                    ai_model=settings.OPENAI_MODEL,
                    processing_time_ms=processing_time_ms
                )
                db_report = report_service.create_report(db, report_create)
                report_id = db_report.id
                logger.info(f"All branches report saved to database: ID={report_id}")
            except Exception as db_error:
                logger.error(f"Error saving all branches report to database: {db_error}", exc_info=True)
                # Không fail request nếu lưu DB lỗi, chỉ log
        
        # 5. Trả về response
        response = AllBranchesAIAgentResponse(
            success=True,
            date=target_date,
            analysis=ai_result.get("analysis", ""),
            summary=ai_result.get("summary"),
            recommendations=ai_result.get("recommendations"),
            raw_data=aggregated_data,
            message=f"Analysis completed successfully in {processing_time_ms}ms. Report ID: {report_id}" if report_id else f"Analysis completed successfully in {processing_time_ms}ms"
        )
        return response
        
    except Exception as e:
        logger.error(f"Error in analyze_all_branches_with_ai endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze-all", response_model=AllBranchesAIAgentResponse)
async def analyze_all_branches_with_ai_get(
    date: date = Query(..., description="Date to analyze"),
    query: Optional[str] = Query(None, description="Optional specific query/question"),
    save_to_db: bool = Query(True, description="Save report to database"),
    force_refresh: bool = Query(False, description="Force refresh - ignore existing report in database"),
    db: Session = Depends(get_db)
):
    """
    Phân tích dữ liệu TẤT CẢ chi nhánh với AI Agent (GET version - dành cho Admin)
    - Tự động kiểm tra database trước, chỉ gọi AI nếu chưa có hoặc force_refresh=true
    """
    request = AllBranchesAIAgentRequest(
        date=date,
        query=query
    )
    return await analyze_all_branches_with_ai(request, db=db, save_to_db=save_to_db, force_refresh=force_refresh)

