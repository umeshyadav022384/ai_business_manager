"""
Purchase business logic — the core of Phase 4.

Stock is always changed through ProductVariant.stock_quantity (Phase
3's single source of truth for stock), never through a separate
grocery/clothing branch: every purchase item resolves to exactly one
ProductVariant.

Phase 6 adds supplier payment tracking:
- amount_paid
- balance_due
- payment_status

These fields describe the payment state of this purchase at the time
it is created or updated.

Supplier's overall payable balance is NOT cached here. It is computed
from purchase balances minus supplier payments in
supplier_payment_service.py.
"""

import uuid
from datetime import date as date_type
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.purchase import Purchase
from app.models.purchase_item import PurchaseItem
from app.models.supplier import Supplier
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseItemCreate,
    PurchaseUpdate,
)


class ProductNotFoundError(Exception):
    pass


class VariantNotFoundError(Exception):
    pass


class VariantRequiredError(Exception):
    """Raised when a product has multiple variants and
    the caller did not specify which variant."""

    pass


class SupplierNotFoundError(Exception):
    pass


class PurchaseNotFoundError(Exception):
    pass


class InvalidPaymentError(Exception):
    """Raised when amount_paid is negative or exceeds the purchase total."""

    pass


def _compute_payment_fields(
    total: Decimal,
    amount_paid: Decimal | None,
) -> tuple[Decimal, Decimal, str]:
    """
    Calculate payment status for a purchase.

    Rules:
    - amount_paid cannot be negative.
    - amount_paid cannot exceed total.
    - paid == total       -> paid
    - paid == 0           -> unpaid
    - 0 < paid < total    -> partial
    """

    paid = Decimal("0.00") if amount_paid is None else amount_paid

    if paid < 0:
        raise InvalidPaymentError(
            "amount_paid cannot be negative"
        )

    if paid > total:
        raise InvalidPaymentError(
            "amount_paid cannot exceed total"
        )

    balance_due = (total - paid).quantize(Decimal("0.01"))

    if balance_due == Decimal("0.00"):
        payment_status = "paid"
    elif paid == Decimal("0.00"):
        payment_status = "unpaid"
    else:
        payment_status = "partial"

    return paid, balance_due, payment_status


def _validate_supplier(
    db: Session,
    *,
    business_id: uuid.UUID,
    supplier_id: uuid.UUID | None,
) -> None:
    if supplier_id is None:
        return

    exists = (
        db.query(Supplier.id)
        .filter(
            Supplier.id == supplier_id,
            Supplier.business_id == business_id,
        )
        .first()
    )

    if exists is None:
        raise SupplierNotFoundError("Supplier not found")


def _resolve_variant(
    db: Session,
    *,
    business_id: uuid.UUID,
    product_id: uuid.UUID,
    requested_variant_id: uuid.UUID | None,
) -> ProductVariant:

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.business_id == business_id,
        )
        .first()
    )

    if product is None:
        raise ProductNotFoundError("Product not found")

    if requested_variant_id is not None:
        variant = (
            db.query(ProductVariant)
            .filter(
                ProductVariant.id == requested_variant_id,
                ProductVariant.product_id == product.id,
                ProductVariant.business_id == business_id,
            )
            .first()
        )

        if variant is None:
            raise VariantNotFoundError(
                "Variant not found for this product"
            )

        return variant

    variants = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id == product.id
        )
        .all()
    )

    if len(variants) == 1:
        return variants[0]

    raise VariantRequiredError(
        "This product has multiple variants — "
        "specify product_variant_id"
    )


def _build_item(
    db: Session,
    *,
    business_id: uuid.UUID,
    item_payload: PurchaseItemCreate,
) -> tuple[PurchaseItem, ProductVariant]:

    variant = _resolve_variant(
        db,
        business_id=business_id,
        product_id=item_payload.product_id,
        requested_variant_id=item_payload.product_variant_id,
    )

    total_cost = (
        item_payload.quantity * item_payload.unit_cost
    ).quantize(Decimal("0.01"))

    item = PurchaseItem(
        product_id=item_payload.product_id,
        product_variant_id=variant.id,
        quantity=item_payload.quantity,
        unit_cost=item_payload.unit_cost,
        total_cost=total_cost,
    )

    return item, variant


def _purchase_query(
    db: Session,
    business_id: uuid.UUID,
):
    return (
        db.query(Purchase)
        .options(
            selectinload(Purchase.supplier),
            selectinload(Purchase.items).selectinload(
                PurchaseItem.product
            ),
            selectinload(Purchase.items).selectinload(
                PurchaseItem.product_variant
            ),
        )
        .filter(
            Purchase.business_id == business_id
        )
    )


def create_purchase(
    db: Session,
    *,
    business_id: uuid.UUID,
    payload: PurchaseCreate,
) -> Purchase:

    _validate_supplier(
        db,
        business_id=business_id,
        supplier_id=payload.supplier_id,
    )

    resolved = [
        (
            *_build_item(
                db,
                business_id=business_id,
                item_payload=item_payload,
            ),
            item_payload.quantity,
        )
        for item_payload in payload.items
    ]

    subtotal = sum(
        (
            item.total_cost
            for item, _variant, _qty in resolved
        ),
        Decimal("0.00"),
    )

    total_amount = (
        subtotal
        - payload.discount
        + payload.tax
    )

    # Phase 6: calculate supplier payment state.
    amount_paid, balance_due, payment_status = (
        _compute_payment_fields(
            total_amount,
            payload.amount_paid,
        )
    )

    purchase = Purchase(
        business_id=business_id,
        supplier_id=payload.supplier_id,
        purchase_date=payload.purchase_date,
        invoice_number=payload.invoice_number,
        notes=payload.notes,
        subtotal=subtotal,
        discount=payload.discount,
        tax=payload.tax,
        total_amount=total_amount,

        # Phase 6 payment tracking
        amount_paid=amount_paid,
        balance_due=balance_due,
        payment_status=payment_status,
    )

    db.add(purchase)
    db.flush()

    for item, variant, quantity in resolved:
        item.purchase_id = purchase.id
        db.add(item)

        # Purchase increases inventory.
        variant.stock_quantity = (
            variant.stock_quantity + quantity
        )

    db.commit()
    db.refresh(purchase)

    return get_purchase(
        db,
        business_id=business_id,
        purchase_id=purchase.id,
    )


def list_purchases(
    db: Session,
    *,
    business_id: uuid.UUID,
    supplier_id: uuid.UUID | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    invoice_number: str | None = None,
) -> list[Purchase]:

    query = _purchase_query(
        db,
        business_id,
    )

    if supplier_id is not None:
        query = query.filter(
            Purchase.supplier_id == supplier_id
        )

    if date_from is not None:
        query = query.filter(
            Purchase.purchase_date >= date_from
        )

    if date_to is not None:
        query = query.filter(
            Purchase.purchase_date <= date_to
        )

    if invoice_number:
        query = query.filter(
            Purchase.invoice_number.ilike(
                f"%{invoice_number}%"
            )
        )

    return query.order_by(
        Purchase.purchase_date.desc(),
        Purchase.created_at.desc(),
    ).all()


def get_purchase(
    db: Session,
    *,
    business_id: uuid.UUID,
    purchase_id: uuid.UUID,
) -> Purchase:

    purchase = (
        _purchase_query(
            db,
            business_id,
        )
        .filter(Purchase.id == purchase_id)
        .first()
    )

    if purchase is None:
        raise PurchaseNotFoundError(
            "Purchase not found"
        )

    return purchase


def update_purchase(
    db: Session,
    *,
    business_id: uuid.UUID,
    purchase_id: uuid.UUID,
    payload: PurchaseUpdate,
) -> Purchase:

    purchase = get_purchase(
        db,
        business_id=business_id,
        purchase_id=purchase_id,
    )

    _validate_supplier(
        db,
        business_id=business_id,
        supplier_id=payload.supplier_id,
    )

    # ---------------------------------------------------------
    # 1. Reverse the existing purchase's stock effect.
    # ---------------------------------------------------------

    for old_item in purchase.items:
        if old_item.product_variant is not None:
            old_item.product_variant.stock_quantity = max(
                0,
                old_item.product_variant.stock_quantity
                - old_item.quantity,
            )

    purchase.items.clear()
    db.flush()

    # ---------------------------------------------------------
    # 2. Build the new purchase items.
    # ---------------------------------------------------------

    resolved = [
        (
            *_build_item(
                db,
                business_id=business_id,
                item_payload=item_payload,
            ),
            item_payload.quantity,
        )
        for item_payload in payload.items
    ]

    subtotal = sum(
        (
            item.total_cost
            for item, _variant, _qty in resolved
        ),
        Decimal("0.00"),
    )

    total_amount = (
        subtotal
        - payload.discount
        + payload.tax
    )

    # ---------------------------------------------------------
    # 3. Preserve existing payment if amount_paid was not
    #    explicitly changed.
    # ---------------------------------------------------------

    effective_amount_paid = (
        payload.amount_paid
        if payload.amount_paid is not None
        else purchase.amount_paid
    )

    amount_paid, balance_due, payment_status = (
        _compute_payment_fields(
            total_amount,
            effective_amount_paid,
        )
    )

    # ---------------------------------------------------------
    # 4. Update purchase information.
    # ---------------------------------------------------------

    purchase.supplier_id = payload.supplier_id
    purchase.purchase_date = payload.purchase_date
    purchase.invoice_number = payload.invoice_number
    purchase.notes = payload.notes
    purchase.subtotal = subtotal
    purchase.discount = payload.discount
    purchase.tax = payload.tax
    purchase.total_amount = total_amount

    # Phase 6 payment tracking
    purchase.amount_paid = amount_paid
    purchase.balance_due = balance_due
    purchase.payment_status = payment_status

    # ---------------------------------------------------------
    # 5. Apply the new stock effect.
    # ---------------------------------------------------------

    for item, variant, quantity in resolved:
        item.purchase_id = purchase.id
        db.add(item)

        # Purchase increases inventory.
        variant.stock_quantity = (
            variant.stock_quantity + quantity
        )

    db.commit()

    return get_purchase(
        db,
        business_id=business_id,
        purchase_id=purchase.id,
    )


def delete_purchase(
    db: Session,
    *,
    business_id: uuid.UUID,
    purchase_id: uuid.UUID,
) -> None:

    purchase = get_purchase(
        db,
        business_id=business_id,
        purchase_id=purchase_id,
    )

    # Reverse the purchase's stock effect.
    for item in purchase.items:
        if item.product_variant is not None:
            item.product_variant.stock_quantity = max(
                0,
                item.product_variant.stock_quantity
                - item.quantity,
            )

    # Hard delete purchase.
    # Payment information disappears with the purchase.
    db.delete(purchase)

    db.commit()