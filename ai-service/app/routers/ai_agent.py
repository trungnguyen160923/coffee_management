"""
API Routes for AI Agent
Tổng hợp 3 JSON từ các service và xử lý với AI
"""
from fastapi import APIRouter, HTTPException, Query
from datetime import date
from typing import Optional
from app.services.ai_agent_service import AIAgentService
from app.schemas.ai_agent import AIAgentRequest, AIAgentResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/agent", tags=["AI Agent"])

# Initialize service
ai_agent_service = AIAgentService()


@router.post("/analyze", response_model=AIAgentResponse)
async def analyze_with_ai(request: AIAgentRequest):
    """
    Phân tích dữ liệu với AI Agent
    - Thu thập 3 JSON từ order-service và catalog-service
    - Tổng hợp thành context
    - Xử lý với LangChain + OpenAI GPT-4o
    """
    try:
        # 1. Thu thập 3 JSON từ các service
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
        
        # 3. Trả về response
        return AIAgentResponse(
            success=True,
            branch_id=request.branch_id,
            date=request.date,
            analysis=ai_result.get("analysis", ""),
            summary=ai_result.get("summary"),
            recommendations=ai_result.get("recommendations"),
            raw_data=aggregated_data,
            message="Analysis completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error in analyze_with_ai endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze", response_model=AIAgentResponse)
async def analyze_with_ai_get(
    branch_id: int = Query(..., description="Branch ID to analyze"),
    date: date = Query(..., description="Date to analyze"),
    query: Optional[str] = Query(None, description="Optional specific query/question"),
    tool_type: Optional[str] = Query(None, description="Type of tool: 'tool1' or 'tool3'")
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
    return await analyze_with_ai(request)


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

