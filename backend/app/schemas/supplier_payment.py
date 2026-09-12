import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.customer_payment import LedgerEntry, PaymentMethod


class SupplierPaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_date: date
    purchase_id: uuid.UUID | None = None
    payment_method: PaymentMethod = "cash"
    reference_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class SupplierPaymentResponse(BaseModel):
    id: uuid.UUID
    supplier_id: uuid.UUID
    purchase_id: uuid.UUID | None
    amount: Decimal
    payment_date: date
    payment_method: str
    reference_number: str | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class SupplierBalanceResponse(BaseModel):
    supplier_id: uuid.UUID
    total_purchases: Decimal
    total_paid: Decimal
    balance: Decimal


class SupplierLedgerResponse(BaseModel):
    balance: SupplierBalanceResponse
    entries: list[LedgerEntry]