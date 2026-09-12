"""
Pydantic schemas for sales and sale items.

Like PurchaseCreate (Phase 4), SaleCreate never accepts a client-
supplied total or item total — unit_price is the only price input per
item, and quantity * unit_price is always computed server-side. unit_
cost is never accepted from the client at all: it's always taken from
the product's current purchase_price at the moment of sale (see
services/sale_service.py).

profit / total_profit are read via from_attributes off the ORM
model's own properties (SaleItem.profit, Sale.total_profit) — they are
not accepted as input anywhere, only ever computed and exposed.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.customer import CustomerResponse


class SaleItemCreate(BaseModel):
    product_id: uuid.UUID
    product_variant_id: uuid.UUID | None = None
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(ge=0)


class SaleCreate(BaseModel):
    customer_id: uuid.UUID | None = None
    sale_date: date
    invoice_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    tax: Decimal = Field(default=Decimal("0"), ge=0)
    items: list[SaleItemCreate] = Field(min_length=1)
    amount_paid: Decimal | None = Field(default=None, ge=0)


class SaleUpdate(BaseModel):
    """Full replace, same rationale as PurchaseUpdate: editing a sale
    means reversing every existing item's stock effect and re-applying
    the new item list from scratch, so the whole item list is always
    resupplied rather than patched."""

    customer_id: uuid.UUID | None = None
    sale_date: date
    invoice_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    discount: Decimal = Field(default=Decimal("0"), ge=0)
    tax: Decimal = Field(default=Decimal("0"), ge=0)
    items: list[SaleItemCreate] = Field(min_length=1)
    amount_paid: Decimal | None = Field(default=None, ge=0)

class SaleItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_variant_id: uuid.UUID | None
    product_name: str
    variant_label: str | None
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    total: Decimal
    profit: Decimal

    class Config:
        from_attributes = True


class SaleResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    customer: CustomerResponse | None
    invoice_number: str | None
    sale_date: date
    notes: str | None
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    payment_status: str
    total_profit: Decimal
    items: list[SaleItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True