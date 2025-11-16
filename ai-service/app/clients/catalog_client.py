"""
HTTP Client for Catalog Service
"""
import httpx
from typing import Optional, Dict, Any
from datetime import date
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class CatalogServiceClient:
    """Client to interact with Catalog Service"""
    
    def __init__(self):
        self.base_url = settings.CATALOG_SERVICE_URL
        self.timeout = 30.0
    
    async def get_inventory_metrics(
        self, 
        branch_id: int, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get inventory metrics for a branch on a specific date"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/catalogs/api/analytics/metrics/inventory"
                params = {
                    "branchId": branch_id,
                    "date": target_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching inventory metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_inventory_metrics: {e}")
            return None
    
    async def get_material_cost_metrics(
        self, 
        branch_id: int, 
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, Any]]:
        """Get material cost metrics for a branch in a date range"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}/catalogs/api/analytics/metrics/material-cost"
                params = {
                    "branchId": branch_id,
                    "startDate": start_date.isoformat(),
                    "endDate": end_date.isoformat()
                }
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("result") if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.error(f"Error fetching material cost metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_material_cost_metrics: {e}")
            return None

