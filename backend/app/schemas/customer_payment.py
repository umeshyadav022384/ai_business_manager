import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

PaymentMethod = Literal["cash", "bank", "card", "digital_wallet", "other"]


class CustomerPaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_date: date
    sale_id: uuid.UUID | None = None
    payment_method: PaymentMethod = "cash"
    reference_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class CustomerPaymentResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    sale_id: uuid.UUID | None
    amount: Decimal
    payment_date: date
    payment_method: str
    reference_number: str | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerBalanceResponse(BaseModel):
    customer_id: uuid.UUID
    total_sales: Decimal
    total_paid: Decimal
    balance: Decimal


class LedgerEntry(BaseModel):
    date: date
    type: Literal["sale", "purchase", "payment"]
    reference: str | None
    amount: Decimal
    paid: Decimal | None
    due: Decimal | None


class CustomerLedgerResponse(BaseModel):
    balance: CustomerBalanceResponse
    entries: list[LedgerEntry]