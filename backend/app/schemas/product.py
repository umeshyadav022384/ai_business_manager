"""
Pydantic schemas for products and variants.

Deliberately business-type-agnostic: there is no "GroceryProductCreate"
vs "ClothingProductCreate". The same ProductCreate schema serves both;
whether variants are required is a service-layer decision (see
services/product_service.py), not a schema-level one.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProductVariantCreate(BaseModel):
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)
    stock_quantity: int = Field(default=0, ge=0)


class ProductVariantUpdate(BaseModel):
    size: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)
    stock_quantity: int | None = Field(default=None, ge=0)


class ProductVariantResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    size: str | None
    color: str | None
    stock_quantity: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    brand: str | None = Field(default=None, max_length=100)

    # Grocery-only in practice; harmless if omitted for clothing.
    unit: str | None = Field(default=None, max_length=20)
    expiry_date: date | None = None

    purchase_price: Decimal = Field(ge=0)
    selling_price: Decimal = Field(ge=0)
    reorder_level: int | None = Field(default=None, ge=0)

    # Optional. If omitted (typical grocery flow), the service
    # auto-creates a single default variant. If provided (typical
    # clothing flow), these variants are created exactly as given.
    variants: list[ProductVariantCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    """All fields optional — only the ones provided are changed.
    Does not touch variants; use the dedicated variant endpoints for
    stock/size/color changes."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    brand: str | None = Field(default=None, max_length=100)
    unit: str | None = Field(default=None, max_length=20)
    expiry_date: date | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0)
    selling_price: Decimal | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)


class ProductResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    category: str | None
    brand: str | None
    unit: str | None
    expiry_date: date | None
    purchase_price: Decimal
    selling_price: Decimal
    reorder_level: int | None
    created_at: datetime
    updated_at: datetime
    variants: list[ProductVariantResponse]

    class Config:
        from_attributes = True