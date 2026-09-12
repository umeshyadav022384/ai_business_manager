"""
Supplier payment/balance business logic — mirrors
customer_payment_service.py exactly, opposite accounting direction.
"""

import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.purchase import Purchase
from app.models.supplier import Supplier
from app.models.supplier_payment import SupplierPayment
from app.schemas.customer_payment import LedgerEntry
from app.schemas.supplier_payment import SupplierBalanceResponse, SupplierPaymentCreate


class SupplierNotFoundError(Exception):
    pass


class PurchaseNotFoundError(Exception):
    pass


class InvalidPaymentError(Exception):
    pass


def _get_supplier(db: Session, *, business_id: uuid.UUID, supplier_id: uuid.UUID) -> Supplier:
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id, Supplier.business_id == business_id)
        .first()
    )
    if supplier is None:
        raise SupplierNotFoundError("Supplier not found")
    return supplier


def get_balance(
    db: Session, *, business_id: uuid.UUID, supplier_id: uuid.UUID
) -> SupplierBalanceResponse:
    _get_supplier(db, business_id=business_id, supplier_id=supplier_id)

    total_due_rows = (
        db.query(Purchase)
        .filter(Purchase.business_id == business_id, Purchase.supplier_id == supplier_id)
        .with_entities(Purchase.balance_due)
        .all()
    )
    total_due = sum((row[0] for row in total_due_rows), Decimal("0.00"))

    total_paid_rows = (
        db.query(SupplierPayment)
        .filter(
            SupplierPayment.business_id == business_id,
            SupplierPayment.supplier_id == supplier_id,
        )
        .with_entities(SupplierPayment.amount)
        .all()
    )
    total_paid = sum((row[0] for row in total_paid_rows), Decimal("0.00"))

    return SupplierBalanceResponse(
        supplier_id=supplier_id,
        total_purchases=total_due,
        total_paid=total_paid,
        balance=(total_due - total_paid).quantize(Decimal("0.01")),
    )


def get_ledger(db: Session, *, business_id: uuid.UUID, supplier_id: uuid.UUID):
    balance = get_balance(db, business_id=business_id, supplier_id=supplier_id)

    purchases = (
        db.query(Purchase)
        .filter(Purchase.business_id == business_id, Purchase.supplier_id == supplier_id)
        .order_by(Purchase.purchase_date)
        .all()
    )
    payments = (
        db.query(SupplierPayment)
        .filter(
            SupplierPayment.business_id == business_id,
            SupplierPayment.supplier_id == supplier_id,
        )
        .order_by(SupplierPayment.payment_date)
        .all()
    )

    entries = [
        LedgerEntry(
            date=purchase.purchase_date,
            type="purchase",
            reference=purchase.invoice_number,
            amount=purchase.total_amount,
            paid=purchase.amount_paid,
            due=purchase.balance_due,
        )
        for purchase in purchases
    ] + [
        LedgerEntry(
            date=payment.payment_date,
            type="payment",
            reference=payment.reference_number,
            amount=payment.amount,
            paid=None,
            due=None,
        )
        for payment in payments
    ]
    entries.sort(key=lambda e: e.date)

    return balance, entries


def record_payment(
    db: Session,
    *,
    business_id: uuid.UUID,
    supplier_id: uuid.UUID,
    payload: SupplierPaymentCreate,
) -> SupplierPayment:
    _get_supplier(db, business_id=business_id, supplier_id=supplier_id)

    if payload.purchase_id is not None:
        purchase_exists = (
            db.query(Purchase.id)
            .filter(
                Purchase.id == payload.purchase_id,
                Purchase.business_id == business_id,
                Purchase.supplier_id == supplier_id,
            )
            .first()
        )
        if purchase_exists is None:
            raise PurchaseNotFoundError("Purchase not found for this supplier")

    current_balance = get_balance(db, business_id=business_id, supplier_id=supplier_id).balance
    if payload.amount > current_balance:
        raise InvalidPaymentError(
            f"Payment of {payload.amount} exceeds the outstanding balance of {current_balance}"
        )

    payment = SupplierPayment(
        business_id=business_id,
        supplier_id=supplier_id,
        **payload.model_dump(),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def list_payments(
    db: Session, *, business_id: uuid.UUID, supplier_id: uuid.UUID
) -> list[SupplierPayment]:
    _get_supplier(db, business_id=business_id, supplier_id=supplier_id)
    return (
        db.query(SupplierPayment)
        .filter(
            SupplierPayment.business_id == business_id,
            SupplierPayment.supplier_id == supplier_id,
        )
        .order_by(SupplierPayment.payment_date.desc())
        .all()
    )