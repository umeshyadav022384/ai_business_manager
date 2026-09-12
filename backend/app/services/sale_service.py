"""
Sale business logic — the mirror image of services/purchase_service.py
(Phase 4): every sale item resolves to exactly one ProductVariant
(same resolution rules as purchases — grocery auto-resolves; a
clothing product with more than one variant requires an explicit
choice), and that variant's stock_quantity is what gets decremented.

Stock is validated BEFORE anything is written: if requested quantity
exceeds available stock for any item, the whole sale is rejected with
a clear message and nothing is created.

Editing and deleting both work by fully reversing the sale's existing
stock effect (returning items to inventory) before applying whatever
comes next.

unit_cost, product_name, and variant_label are snapshotted onto each
SaleItem at creation time so historical profit and display stay correct
even if the product's price or name changes later.

Payment tracking:
- amount_paid can never be negative.
- amount_paid cannot exceed total.
- balance_due = total - amount_paid.
- payment_status is "paid", "partial", or "unpaid".
"""

import uuid
from datetime import date as date_type
from decimal import Decimal

from sqlalchemy.orm import Session, selectinload

from app.models.customer import Customer
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.schemas.sale import SaleCreate, SaleItemCreate, SaleUpdate


class ProductNotFoundError(Exception):
    pass


class VariantNotFoundError(Exception):
    pass


class VariantRequiredError(Exception):
    pass


class InsufficientStockError(Exception):
    pass


class CustomerNotFoundError(Exception):
    pass


class SaleNotFoundError(Exception):
    pass


class InvalidPaymentError(Exception):
    """amount_paid cannot be negative or greater than total."""
    pass


def _compute_payment_fields(
    total: Decimal,
    amount_paid: Decimal | None,
) -> tuple[Decimal, Decimal, str]:
    """
    Calculate amount_paid, balance_due and payment_status.

    If amount_paid is omitted, the sale is considered fully paid.
    """

    # Existing sales behavior remains compatible:
    # if no amount_paid is supplied, consider the sale fully paid.
    if amount_paid is None:
        amount_paid = total

    amount_paid = Decimal(str(amount_paid))

    if amount_paid < Decimal("0.00"):
        raise InvalidPaymentError("Amount paid cannot be negative")

    if amount_paid > total:
        raise InvalidPaymentError(
            "Amount paid cannot be greater than the sale total"
        )

    balance_due = (total - amount_paid).quantize(Decimal("0.01"))

    if amount_paid == Decimal("0.00"):
        payment_status = "unpaid"
    elif balance_due == Decimal("0.00"):
        payment_status = "paid"
    else:
        payment_status = "partial"

    return amount_paid, balance_due, payment_status


def _variant_label(variant: ProductVariant) -> str | None:
    parts = [p for p in (variant.size, variant.color) if p]
    return " / ".join(parts) if parts else None


def _validate_customer(
    db: Session,
    *,
    business_id: uuid.UUID,
    customer_id: uuid.UUID | None,
) -> None:
    if customer_id is None:
        return

    exists = (
        db.query(Customer.id)
        .filter(
            Customer.id == customer_id,
            Customer.business_id == business_id,
        )
        .first()
    )

    if exists is None:
        raise CustomerNotFoundError("Customer not found")


def _resolve_variant(
    db: Session,
    *,
    business_id: uuid.UUID,
    product_id: uuid.UUID,
    requested_variant_id: uuid.UUID | None,
) -> tuple[Product, ProductVariant]:

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

        return product, variant

    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product.id)
        .all()
    )

    if len(variants) == 1:
        return product, variants[0]

    raise VariantRequiredError(
        "This product has multiple variants — specify product_variant_id"
    )


def _build_item(
    db: Session,
    *,
    business_id: uuid.UUID,
    item_payload: SaleItemCreate,
) -> tuple[SaleItem, ProductVariant]:

    product, variant = _resolve_variant(
        db,
        business_id=business_id,
        product_id=item_payload.product_id,
        requested_variant_id=item_payload.product_variant_id,
    )

    if variant.stock_quantity < item_payload.quantity:
        label = _variant_label(variant)
        suffix = f" ({label})" if label else ""

        raise InsufficientStockError(
            f'Only {variant.stock_quantity} units available '
            f'for "{product.name}"{suffix}'
        )

    total = (
        item_payload.quantity * item_payload.unit_price
    ).quantize(Decimal("0.01"))

    item = SaleItem(
        product_id=product.id,
        product_variant_id=variant.id,
        product_name=product.name,
        variant_label=_variant_label(variant),
        quantity=item_payload.quantity,
        unit_price=item_payload.unit_price,
        unit_cost=product.purchase_price,
        total=total,
    )

    return item, variant


def _sale_query(db: Session, business_id: uuid.UUID):
    return (
        db.query(Sale)
        .options(
            selectinload(Sale.customer),
            selectinload(Sale.items),
        )
        .filter(Sale.business_id == business_id)
    )


def create_sale(
    db: Session,
    *,
    business_id: uuid.UUID,
    payload: SaleCreate,
) -> Sale:

    _validate_customer(
        db,
        business_id=business_id,
        customer_id=payload.customer_id,
    )

    # Build and validate ALL items before changing inventory.
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
        (item.total for item, _variant, _qty in resolved),
        Decimal("0.00"),
    )

    total = subtotal - payload.discount + payload.tax

    # Payment calculation
    amount_paid, balance_due, payment_status = _compute_payment_fields(
        total,
        payload.amount_paid,
    )

    sale = Sale(
        business_id=business_id,
        customer_id=payload.customer_id,
        invoice_number=payload.invoice_number,
        sale_date=payload.sale_date,
        notes=payload.notes,
        subtotal=subtotal,
        discount=payload.discount,
        tax=payload.tax,
        total=total,

        # Phase 6 payment fields
        amount_paid=amount_paid,
        balance_due=balance_due,
        payment_status=payment_status,
    )

    db.add(sale)
    db.flush()

    for item, variant, quantity in resolved:
        item.sale_id = sale.id
        db.add(item)

        # Sale removes stock.
        variant.stock_quantity = (
            variant.stock_quantity - quantity
        )

    db.commit()
    db.refresh(sale)

    return get_sale(
        db,
        business_id=business_id,
        sale_id=sale.id,
    )


def list_sales(
    db: Session,
    *,
    business_id: uuid.UUID,
    customer_id: uuid.UUID | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    invoice_number: str | None = None,
) -> list[Sale]:

    query = _sale_query(db, business_id)

    if customer_id is not None:
        query = query.filter(
            Sale.customer_id == customer_id
        )

    if date_from is not None:
        query = query.filter(
            Sale.sale_date >= date_from
        )

    if date_to is not None:
        query = query.filter(
            Sale.sale_date <= date_to
        )

    if invoice_number:
        query = query.filter(
            Sale.invoice_number.ilike(
                f"%{invoice_number}%"
            )
        )

    return query.order_by(
        Sale.sale_date.desc(),
        Sale.created_at.desc(),
    ).all()


def get_sale(
    db: Session,
    *,
    business_id: uuid.UUID,
    sale_id: uuid.UUID,
) -> Sale:

    sale = (
        _sale_query(db, business_id)
        .filter(Sale.id == sale_id)
        .first()
    )

    if sale is None:
        raise SaleNotFoundError("Sale not found")

    return sale


def update_sale(
    db: Session,
    *,
    business_id: uuid.UUID,
    sale_id: uuid.UUID,
    payload: SaleUpdate,
) -> Sale:

    sale = get_sale(
        db,
        business_id=business_id,
        sale_id=sale_id,
    )

    _validate_customer(
        db,
        business_id=business_id,
        customer_id=payload.customer_id,
    )

    # First return the old sale's stock.
    for old_item in sale.items:
        if old_item.product_variant is not None:
            old_item.product_variant.stock_quantity = (
                old_item.product_variant.stock_quantity
                + old_item.quantity
            )

    sale.items.clear()
    db.flush()

    # Build and validate the new items.
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
        (item.total for item, _variant, _qty in resolved),
        Decimal("0.00"),
    )

    total = subtotal - payload.discount + payload.tax

    # Preserve the existing payment amount when the edit does not
    # explicitly provide a new amount_paid value.
    effective_amount_paid = (
        payload.amount_paid
        if payload.amount_paid is not None
        else sale.amount_paid
    )

    amount_paid, balance_due, payment_status = _compute_payment_fields(
        total,
        effective_amount_paid,
    )

    sale.customer_id = payload.customer_id
    sale.sale_date = payload.sale_date
    sale.invoice_number = payload.invoice_number
    sale.notes = payload.notes
    sale.subtotal = subtotal
    sale.discount = payload.discount
    sale.tax = payload.tax
    sale.total = total

    # Phase 6 payment fields
    sale.amount_paid = amount_paid
    sale.balance_due = balance_due
    sale.payment_status = payment_status

    # Remove the new sale quantities from inventory.
    for item, variant, quantity in resolved:
        item.sale_id = sale.id
        db.add(item)

        variant.stock_quantity = (
            variant.stock_quantity - quantity
        )

    db.commit()

    return get_sale(
        db,
        business_id=business_id,
        sale_id=sale.id,
    )


def delete_sale(
    db: Session,
    *,
    business_id: uuid.UUID,
    sale_id: uuid.UUID,
) -> None:

    sale = get_sale(
        db,
        business_id=business_id,
        sale_id=sale_id,
    )

    # Return sold stock to inventory.
    for item in sale.items:
        if item.product_variant is not None:
            item.product_variant.stock_quantity = (
                item.product_variant.stock_quantity
                + item.quantity
            )

    db.delete(sale)
    db.commit()