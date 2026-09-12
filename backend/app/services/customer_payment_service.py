"""
Customer payment/balance business logic.

balance = SUM(sale.balance_due) - SUM(customer_payments.amount)
— always computed, never cached. A cancelled sale (hard delete) needs
no special handling: its balance_due drops out of the sum on delete.

Known limitation: if a payment was tied to a specific sale via sale_id
and that sale is later cancelled, the payment itself is preserved
(sale_id set NULL) and still counts against the customer's balance. A
true refund/reversal flow is out of scope for Phase 6.
"""

import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.customer_payment import CustomerPayment
from app.models.sale import Sale
from app.schemas.customer_payment import (
    CustomerBalanceResponse,
    CustomerPaymentCreate,
    LedgerEntry,
)


class CustomerNotFoundError(Exception):
    pass


class SaleNotFoundError(Exception):
    pass


class InvalidPaymentError(Exception):
    pass


def _get_customer(db: Session, *, business_id: uuid.UUID, customer_id: uuid.UUID) -> Customer:
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.business_id == business_id)
        .first()
    )
    if customer is None:
        raise CustomerNotFoundError("Customer not found")
    return customer


def get_balance(
    db: Session, *, business_id: uuid.UUID, customer_id: uuid.UUID
) -> CustomerBalanceResponse:
    _get_customer(db, business_id=business_id, customer_id=customer_id)

    total_sales_rows = (
        db.query(Sale)
        .filter(Sale.business_id == business_id, Sale.customer_id == customer_id)
        .with_entities(Sale.balance_due)
        .all()
    )
    total_due = sum((row[0] for row in total_sales_rows), Decimal("0.00"))

    total_paid_rows = (
        db.query(CustomerPayment)
        .filter(
            CustomerPayment.business_id == business_id,
            CustomerPayment.customer_id == customer_id,
        )
        .with_entities(CustomerPayment.amount)
        .all()
    )
    total_paid = sum((row[0] for row in total_paid_rows), Decimal("0.00"))

    return CustomerBalanceResponse(
        customer_id=customer_id,
        total_sales=total_due,
        total_paid=total_paid,
        balance=(total_due - total_paid).quantize(Decimal("0.01")),
    )


def get_ledger(db: Session, *, business_id: uuid.UUID, customer_id: uuid.UUID):
    balance = get_balance(db, business_id=business_id, customer_id=customer_id)

    sales = (
        db.query(Sale)
        .filter(Sale.business_id == business_id, Sale.customer_id == customer_id)
        .order_by(Sale.sale_date)
        .all()
    )
    payments = (
        db.query(CustomerPayment)
        .filter(
            CustomerPayment.business_id == business_id,
            CustomerPayment.customer_id == customer_id,
        )
        .order_by(CustomerPayment.payment_date)
        .all()
    )

    entries = [
        LedgerEntry(
            date=sale.sale_date,
            type="sale",
            reference=sale.invoice_number,
            amount=sale.total,
            paid=sale.amount_paid,
            due=sale.balance_due,
        )
        for sale in sales
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
    customer_id: uuid.UUID,
    payload: CustomerPaymentCreate,
) -> CustomerPayment:
    _get_customer(db, business_id=business_id, customer_id=customer_id)

    if payload.sale_id is not None:
        sale_exists = (
            db.query(Sale.id)
            .filter(
                Sale.id == payload.sale_id,
                Sale.business_id == business_id,
                Sale.customer_id == customer_id,
            )
            .first()
        )
        if sale_exists is None:
            raise SaleNotFoundError("Sale not found for this customer")

    current_balance = get_balance(db, business_id=business_id, customer_id=customer_id).balance
    if payload.amount > current_balance:
        raise InvalidPaymentError(
            f"Payment of {payload.amount} exceeds the outstanding balance of {current_balance}"
        )

    payment = CustomerPayment(
        business_id=business_id,
        customer_id=customer_id,
        **payload.model_dump(),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def list_payments(
    db: Session, *, business_id: uuid.UUID, customer_id: uuid.UUID
) -> list[CustomerPayment]:
    _get_customer(db, business_id=business_id, customer_id=customer_id)
    return (
        db.query(CustomerPayment)
        .filter(
            CustomerPayment.business_id == business_id,
            CustomerPayment.customer_id == customer_id,
        )
        .order_by(CustomerPayment.payment_date.desc())
        .all()
    )