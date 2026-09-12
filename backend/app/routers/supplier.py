import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.services import supplier_service
from app.services.supplier_service import SupplierNotFoundError
from app.schemas.supplier_payment import (
    SupplierBalanceResponse,
    SupplierLedgerResponse,
    SupplierPaymentCreate,
    SupplierPaymentResponse,
)
from app.services import supplier_payment_service
from app.services.supplier_payment_service import (
    InvalidPaymentError,
    PurchaseNotFoundError,
)
router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return supplier_service.create_supplier(db, business_id=business.id, payload=payload)


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return supplier_service.list_suppliers(db, business_id=business.id)


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return supplier_service.get_supplier(
            db, business_id=business.id, supplier_id=supplier_id
        )
    except SupplierNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: uuid.UUID,
    payload: SupplierUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return supplier_service.update_supplier(
            db, business_id=business.id, supplier_id=supplier_id, payload=payload
        )
    except SupplierNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        supplier_service.delete_supplier(db, business_id=business.id, supplier_id=supplier_id)
    except SupplierNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

@router.get("/{supplier_id}/balance", response_model=SupplierBalanceResponse)
def get_supplier_balance(
    supplier_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return supplier_payment_service.get_balance(
            db,
            business_id=business.id,
            supplier_id=supplier_id,
        )
    except SupplierNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )


@router.get("/{supplier_id}/ledger", response_model=SupplierLedgerResponse)
def get_supplier_ledger(
    supplier_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        balance, entries = supplier_payment_service.get_ledger(
            db,
            business_id=business.id,
            supplier_id=supplier_id,
        )
    except SupplierNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    return SupplierLedgerResponse(
        balance=balance,
        entries=entries,
    )


@router.post(
    "/{supplier_id}/payments",
    response_model=SupplierPaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_supplier_payment(
    supplier_id: uuid.UUID,
    payload: SupplierPaymentCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return supplier_payment_service.record_payment(
            db,
            business_id=business.id,
            supplier_id=supplier_id,
            payload=payload,
        )
    except SupplierNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )
    except PurchaseNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except InvalidPaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{supplier_id}/payments",
    response_model=list[SupplierPaymentResponse],
)
def list_supplier_payments(
    supplier_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return supplier_payment_service.list_payments(
            db,
            business_id=business.id,
            supplier_id=supplier_id,
        )
    except SupplierNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )