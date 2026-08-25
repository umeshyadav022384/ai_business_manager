"""
Product and variant routes. Every endpoint depends on
get_current_business (Phase 2), which requires a valid JWT AND a
verified BusinessMember row for the X-Business-Id header — so
business_id is always the caller's own business, never something
supplied directly in the request body or path.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.product import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
)
from app.services import product_service
from app.services.product_service import (
    DuplicateVariantError,
    ProductNotFoundError,
    VariantNotFoundError,
)

router = APIRouter(prefix="/api/v1/products", tags=["products"])


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return product_service.create_product(db, business_id=business.id, payload=payload)


@router.get("", response_model=list[ProductResponse])
def list_products(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return product_service.list_products(db, business_id=business.id)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return product_service.get_product(
            db, business_id=business.id, product_id=product_id
        )
    except ProductNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return product_service.update_product(
            db, business_id=business.id, product_id=product_id, payload=payload
        )
    except ProductNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        product_service.delete_product(db, business_id=business.id, product_id=product_id)
    except ProductNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")


@router.post(
    "/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_variant(
    product_id: uuid.UUID,
    payload: ProductVariantCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return product_service.add_variant(
            db, business_id=business.id, product_id=product_id, payload=payload
        )
    except ProductNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    except DuplicateVariantError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.put("/variants/{variant_id}", response_model=ProductVariantResponse)
def update_variant(
    variant_id: uuid.UUID,
    payload: ProductVariantUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return product_service.update_variant(
            db, business_id=business.id, variant_id=variant_id, payload=payload
        )
    except VariantNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    variant_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        product_service.delete_variant(db, business_id=business.id, variant_id=variant_id)
    except VariantNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")