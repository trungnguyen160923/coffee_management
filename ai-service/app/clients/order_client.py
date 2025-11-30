"""
HTTP Client for Order Service
"""
import httpx
from typing import Optional, Dict, Any
from datetime import date
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class OrderServiceClient:
    """Client to interact with Order Service"""
    
    def __init__(self):
        self.base_url = settings.ORDER_SERVICE_URL
        self.timeout = 30.0
    
    async def get_revenue_metrics(
        self, 
        branch_id: int, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get revenue metrics for a branch on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/revenue"
                params = {
                    "branchId": branch_id,
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching revenue metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_revenue_metrics: {e}")
            return None
    
    async def get_customer_metrics(
        self, 
        branch_id: int, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get customer metrics for a branch on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/customers"
                params = {
                    "branchId": branch_id,
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching customer metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_customer_metrics: {e}")
            return None
    
    async def get_product_metrics(
        self, 
        branch_id: int, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get product metrics for a branch on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/products"
                params = {
                    "branchId": branch_id,
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching product metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_product_metrics: {e}")
            return None
    
    async def get_review_metrics(
        self, 
        branch_id: int, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get review metrics for a branch on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/reviews"
                params = {
                    "branchId": branch_id,
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching review metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_review_metrics: {e}")
            return None
    
    async def get_all_branches_revenue_metrics(
        self, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get revenue metrics for all branches on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/revenue/all"
                params = {
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching all branches revenue metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_all_branches_revenue_metrics: {e}")
            return None
    
    async def get_all_branches_customer_metrics(
        self, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get customer metrics for all branches on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/customers/all"
                params = {
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching all branches customer metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_all_branches_customer_metrics: {e}")
            return None
    
    async def get_all_branches_product_metrics(
        self, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get product metrics for all branches on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/products/all"
                params = {
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching all branches product metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_all_branches_product_metrics: {e}")
            return None
    
    async def get_all_branches_review_metrics(
        self, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get review metrics for all branches on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/analytics/metrics/reviews/all"
                params = {
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching all branches review metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_all_branches_review_metrics: {e}")
            return None
    
    async def get_all_branches_stats(
        self,
        date_from: date,
        date_to: date
    ) -> Optional[Dict[str, Any]]:
        """Get stats for all branches in a date range"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/branches/stats/all"
                params = {
                    "dateFrom": date_from.isoformat(),
                    "dateTo": date_to.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching all branches stats: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_all_branches_stats: {e}")
            return None
    
    async def get_all_branches_revenue(
        self,
        date_from: date,
        date_to: date
    ) -> Optional[Dict[str, Any]]:
        """Get revenue for all branches in a date range"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/order-service/api/branches/revenue/all"
                params = {
                    "dateFrom": date_from.isoformat(),
                    "dateTo": date_to.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching all branches revenue: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_all_branches_revenue: {e}")
            return None
    
