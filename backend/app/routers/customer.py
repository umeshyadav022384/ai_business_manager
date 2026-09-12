import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services import customer_service
from app.services.customer_service import CustomerNotFoundError
from app.schemas.customer_payment import (
    CustomerBalanceResponse, CustomerLedgerResponse,
    CustomerPaymentCreate, CustomerPaymentResponse,
)
from app.services import customer_payment_service
from app.services.customer_payment_service import InvalidPaymentError, SaleNotFoundError

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return customer_service.create_customer(db, business_id=business.id, payload=payload)


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return customer_service.list_customers(db, business_id=business.id)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return customer_service.get_customer(
            db, business_id=business.id, customer_id=customer_id
        )
    except CustomerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return customer_service.update_customer(
            db, business_id=business.id, customer_id=customer_id, payload=payload
        )
    except CustomerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        customer_service.delete_customer(db, business_id=business.id, customer_id=customer_id)
    except CustomerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")


@router.get("/{customer_id}/balance", response_model=CustomerBalanceResponse)
def get_customer_balance(
    customer_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return customer_payment_service.get_balance(db, business_id=business.id, customer_id=customer_id)
    except CustomerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")


@router.get("/{customer_id}/ledger", response_model=CustomerLedgerResponse)
def get_customer_ledger(
    customer_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        balance, entries = customer_payment_service.get_ledger(db, business_id=business.id, customer_id=customer_id)
    except CustomerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return CustomerLedgerResponse(balance=balance, entries=entries)


@router.post("/{customer_id}/payments", response_model=CustomerPaymentResponse, status_code=status.HTTP_201_CREATED)
def record_customer_payment(
    customer_id: uuid.UUID,
    payload: CustomerPaymentCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return customer_payment_service.record_payment(db, business_id=business.id, customer_id=customer_id, payload=payload)
    except CustomerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    except SaleNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidPaymentError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{customer_id}/payments", response_model=list[CustomerPaymentResponse])
def list_customer_payments(
    customer_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return customer_payment_service.list_payments(db, business_id=business.id, customer_id=customer_id)
    except CustomerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")