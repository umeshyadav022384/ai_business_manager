from typing import Literal

from pydantic import BaseModel

InsightType = Literal[
    "low_stock",
    "best_seller",
    "slow_seller",
    "sales_trend",
    "expense_warning",
    "profit_insight",
    "customer_udhaar",
    "supplier_payable",
]
InsightSeverity = Literal["info", "warning", "critical"]


class Insight(BaseModel):
    type: InsightType
    severity: InsightSeverity
    title: str
    message: str