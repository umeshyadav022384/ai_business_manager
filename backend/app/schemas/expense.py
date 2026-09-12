import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

PaymentMethod = Literal["cash", "bank", "card", "digital_wallet", "other"]


class ExpenseCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None


class ExpenseCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


class ExpenseCategoryResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    category_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    expense_date: date
    payment_method: PaymentMethod = "cash"
    reference_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    description: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, gt=0)
    expense_date: date | None = None
    payment_method: PaymentMethod | None = None
    reference_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    category: ExpenseCategoryResponse | None
    description: str
    amount: Decimal
    expense_date: date
    payment_method: str
    reference_number: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True