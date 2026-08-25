"""
Product/variant business logic.

Every function here takes business_id as a required parameter and
filters by it on every query — this is the enforcement layer for
tenant isolation described in the Phase 3 architecture. Routers pass
business_id from get_current_business (Phase 2's dependency, backed by
BusinessMember) — never from anything the client supplies directly.
"""

import uuid

from sqlalchemy.orm import Session, selectinload

from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
)


class ProductNotFoundError(Exception):
    pass


class VariantNotFoundError(Exception):
    pass


class DuplicateVariantError(Exception):
    pass


def _product_query(db: Session, business_id: uuid.UUID):
    """Base query used by every read — always scoped to business_id,
    always eager-loads variants so callers get a complete ProductResponse
    without triggering extra queries per product."""
    return (
        db.query(Product)
        .options(selectinload(Product.variants))
        .filter(Product.business_id == business_id)
    )


def create_product(
    db: Session, *, business_id: uuid.UUID, payload: ProductCreate
) -> Product:
    """
    Creates a Product scoped to business_id, plus its variants.

    If payload.variants is empty (the typical grocery case — the
    frontend never asks a grocery owner to think about "variants"),
    exactly one default variant is created automatically with
    size=None, color=None, stock_quantity=0. This is what guarantees
    every product has at least one variant without the caller needing
    to know or care about business type.
    """
    product = Product(
        business_id=business_id,
        name=payload.name,
        category=payload.category,
        brand=payload.brand,
        unit=payload.unit,
        expiry_date=payload.expiry_date,
        purchase_price=payload.purchase_price,
        selling_price=payload.selling_price,
        reorder_level=payload.reorder_level,
    )
    db.add(product)
    db.flush()  # assigns product.id for the variant FK below

    variants_to_create = payload.variants or [ProductVariantCreate()]
    for variant_payload in variants_to_create:
        db.add(
            ProductVariant(
                product_id=product.id,
                business_id=business_id,
                size=variant_payload.size,
                color=variant_payload.color,
                stock_quantity=variant_payload.stock_quantity,
            )
        )

    db.commit()
    db.refresh(product)
    return product


def list_products(db: Session, *, business_id: uuid.UUID) -> list[Product]:
    return _product_query(db, business_id).order_by(Product.created_at.desc()).all()


def get_product(
    db: Session, *, business_id: uuid.UUID, product_id: uuid.UUID
) -> Product:
    product = _product_query(db, business_id).filter(Product.id == product_id).first()
    if product is None:
        # Same error whether the product doesn't exist at all, or
        # exists but belongs to a different business — a client must
        # not be able to distinguish "not found" from "not yours" by
        # response shape.
        raise ProductNotFoundError("Product not found")
    return product


def update_product(
    db: Session,
    *,
    business_id: uuid.UUID,
    product_id: uuid.UUID,
    payload: ProductUpdate,
) -> Product:
    product = get_product(db, business_id=business_id, product_id=product_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(
    db: Session, *, business_id: uuid.UUID, product_id: uuid.UUID
) -> None:
    product = get_product(db, business_id=business_id, product_id=product_id)
    db.delete(product)  # cascades to variants via the relationship/FK
    db.commit()


def add_variant(
    db: Session,
    *,
    business_id: uuid.UUID,
    product_id: uuid.UUID,
    payload: ProductVariantCreate,
) -> ProductVariant:
    """
    Adds a new variant to an existing product — the "add a new
    size/color" flow for clothing. Not meaningful for grocery (which
    only ever has its one auto-created variant), so this is simply an
    operation clothing owners use and grocery owners don't; nothing
    in the code needs to know or enforce that distinction.
    """
    # Confirms the product exists AND belongs to this business before
    # touching anything else.
    get_product(db, business_id=business_id, product_id=product_id)

    variant = ProductVariant(
        product_id=product_id,
        business_id=business_id,
        size=payload.size,
        color=payload.color,
        stock_quantity=payload.stock_quantity,
    )
    db.add(variant)
    try:
        db.flush()
    except Exception:
        db.rollback()
        raise DuplicateVariantError(
            "A variant with this size/color already exists for this product"
        )

    db.commit()
    db.refresh(variant)
    return variant


def _get_variant(
    db: Session, *, business_id: uuid.UUID, variant_id: uuid.UUID
) -> ProductVariant:
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.id == variant_id,
            ProductVariant.business_id == business_id,
        )
        .first()
    )
    if variant is None:
        raise VariantNotFoundError("Variant not found")
    return variant


def update_variant(
    db: Session,
    *,
    business_id: uuid.UUID,
    variant_id: uuid.UUID,
    payload: ProductVariantUpdate,
) -> ProductVariant:
    variant = _get_variant(db, business_id=business_id, variant_id=variant_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(variant, field, value)

    db.commit()
    db.refresh(variant)
    return variant


def delete_variant(
    db: Session, *, business_id: uuid.UUID, variant_id: uuid.UUID
) -> None:
    variant = _get_variant(db, business_id=business_id, variant_id=variant_id)
    db.delete(variant)
    db.commit()