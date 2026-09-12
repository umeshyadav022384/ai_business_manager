"""
Supplier business logic. Same isolation pattern as
services/product_service.py: every function requires business_id and
filters by it; routers pass it from get_current_business, never from
client input.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate


class SupplierNotFoundError(Exception):
    pass


def create_supplier(
    db: Session, *, business_id: uuid.UUID, payload: SupplierCreate
) -> Supplier:
    supplier = Supplier(business_id=business_id, **payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def list_suppliers(db: Session, *, business_id: uuid.UUID) -> list[Supplier]:
    return (
        db.query(Supplier)
        .filter(Supplier.business_id == business_id)
        .order_by(Supplier.name)
        .all()
    )


def get_supplier(
    db: Session, *, business_id: uuid.UUID, supplier_id: uuid.UUID
) -> Supplier:
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id, Supplier.business_id == business_id)
        .first()
    )
    if supplier is None:
        # Same error for "doesn't exist" and "belongs to another
        # business" — no response-shape signal to distinguish them.
        raise SupplierNotFoundError("Supplier not found")
    return supplier


def update_supplier(
    db: Session,
    *,
    business_id: uuid.UUID,
    supplier_id: uuid.UUID,
    payload: SupplierUpdate,
) -> Supplier:
    supplier = get_supplier(db, business_id=business_id, supplier_id=supplier_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(
    db: Session, *, business_id: uuid.UUID, supplier_id: uuid.UUID
) -> None:
    supplier = get_supplier(db, business_id=business_id, supplier_id=supplier_id)
    # Purchases referencing this supplier are preserved — the FK is
    # ON DELETE SET NULL (see models/purchase.py), so purchase history
    # survives a supplier being removed.
    db.delete(supplier)
    db.commit()