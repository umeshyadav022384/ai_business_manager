"""
Customer business logic. Same isolation pattern as
services/supplier_service.py.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerNotFoundError(Exception):
    pass


def create_customer(
    db: Session, *, business_id: uuid.UUID, payload: CustomerCreate
) -> Customer:
    customer = Customer(business_id=business_id, **payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def list_customers(db: Session, *, business_id: uuid.UUID) -> list[Customer]:
    return (
        db.query(Customer)
        .filter(Customer.business_id == business_id)
        .order_by(Customer.name)
        .all()
    )


def get_customer(
    db: Session, *, business_id: uuid.UUID, customer_id: uuid.UUID
) -> Customer:
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.business_id == business_id)
        .first()
    )
    if customer is None:
        raise CustomerNotFoundError("Customer not found")
    return customer


def update_customer(
    db: Session,
    *,
    business_id: uuid.UUID,
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
) -> Customer:
    customer = get_customer(db, business_id=business_id, customer_id=customer_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(
    db: Session, *, business_id: uuid.UUID, customer_id: uuid.UUID
) -> None:
    customer = get_customer(db, business_id=business_id, customer_id=customer_id)
    db.delete(customer)
    db.commit()