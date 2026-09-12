from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class FinancialSummaryResponse(BaseModel):
    date_from: date | None
    date_to: date | None
    revenue: Decimal
    cogs: Decimal
    gross_profit: Decimal
    expenses: Decimal
    net_profit: Decimal
    # Current running balances (not scoped to the report's date range).
    customer_udhaar: Decimal
    supplier_payables: Decimal