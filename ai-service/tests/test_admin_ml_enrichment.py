import pytest
from datetime import date
from unittest.mock import Mock, patch, AsyncMock


@pytest.mark.asyncio
async def test_collect_all_branches_data_includes_ml_for_top_n():
    """
    Ensure admin stats can enrich top-N branches with anomaly + forecast.
    We patch DB session + asyncio.to_thread to keep it deterministic and fast.
    """
    from app.services.ai_agent_service import AIAgentService
    import app.services.ai_agent_service as module

    svc = AIAgentService()
    target_date = date.today()

    # Two branches with different revenue
    row1 = Mock()
    row1.branch_id = 1
    row1.report_date = target_date
    row1.total_revenue = 2000
    row1.order_count = 2
    row1.avg_order_value = 1000
    row1.customer_count = 5
    row1.repeat_customers = 2
    row1.new_customers = 3
    row1.unique_products_sold = 4
    row1.top_selling_product_id = 10
    row1.product_diversity_score = 0.5
    row1.peak_hour = 10
    row1.day_of_week = 4
    row1.is_weekend = False
    row1.avg_preparation_time_seconds = None
    row1.staff_efficiency_score = None
    row1.avg_review_score = 4.2
    row1.material_cost = 800
    row1.waste_percentage = None
    row1.low_stock_products = 1
    row1.out_of_stock_products = 0
    row1.created_at = None

    row2 = Mock()
    row2.branch_id = 2
    row2.report_date = target_date
    row2.total_revenue = 5000  # top by revenue
    row2.order_count = 5
    row2.avg_order_value = 1000
    row2.customer_count = 10
    row2.repeat_customers = 5
    row2.new_customers = 5
    row2.unique_products_sold = 8
    row2.top_selling_product_id = 11
    row2.product_diversity_score = 0.7
    row2.peak_hour = 11
    row2.day_of_week = 4
    row2.is_weekend = False
    row2.avg_preparation_time_seconds = None
    row2.staff_efficiency_score = None
    row2.avg_review_score = 4.6
    row2.material_cost = 1500
    row2.waste_percentage = None
    row2.low_stock_products = 2
    row2.out_of_stock_products = 1
    row2.created_at = None

    class FakeQuery:
        def __init__(self, rows):
            self._rows = rows
        def filter(self, *args, **kwargs):
            return self
        def order_by(self, *args, **kwargs):
            return self
        def all(self):
            return self._rows

    class FakeSession:
        def __init__(self, rows):
            self._rows = rows
        def query(self, *args, **kwargs):
            return FakeQuery(self._rows)
        def close(self):
            return None

    # Patch DB and ML calls
    with patch.object(module, "SessionLocal", return_value=FakeSession([row1, row2])), \
         patch.object(svc, "get_isolation_forest_json", return_value={"confidence": 0.9}), \
         patch.object(svc, "get_prophet_forecast_json", return_value={"do_tin_cay": {"phan_tram": 80}}), \
         patch.object(module.asyncio, "to_thread", new=AsyncMock(side_effect=lambda fn, *a, **k: fn(*a, **k))):

        data = await svc.collect_all_branches_data(
            target_date=target_date,
            include_ml=True,
            ml_branch_limit=1,
            ml_concurrency=1,
        )

    assert data["source"] == "daily_branch_metrics"
    assert data["ml_enrichment"]["branches_processed"] == 1

    # Only top branch (branch_id=2) should be enriched
    branches = {b["branch_id"]: b for b in data["branches"]}
    assert branches[2]["isolation_forest_anomaly"] != {}
    assert branches[2]["prophet_forecast"] != {}
    assert branches[1]["isolation_forest_anomaly"] == {}
    assert branches[1]["prophet_forecast"] == {}


