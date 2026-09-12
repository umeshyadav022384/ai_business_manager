import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.purchase import PurchaseCreate, PurchaseResponse, PurchaseUpdate
from app.services import purchase_service
from app.services.purchase_service import (
    ProductNotFoundError,
    PurchaseNotFoundError,
    SupplierNotFoundError,
    VariantNotFoundError,
    VariantRequiredError,
)

router = APIRouter(prefix="/api/v1/purchases", tags=["purchases"])


def _handle_item_errors(fn, *args, **kwargs):
    """Runs a service call, translating its validation exceptions into
    the right HTTP status — shared by create and update since both can
    fail for the same reasons (bad product/variant/supplier)."""
    try:
        return fn(*args, **kwargs)
    except (ProductNotFoundError, VariantNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except VariantRequiredError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except SupplierNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    payload: PurchaseCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return _handle_item_errors(
        purchase_service.create_purchase, db, business_id=business.id, payload=payload
    )


@router.get("", response_model=list[PurchaseResponse])
def list_purchases(
    supplier_id: uuid.UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    invoice_number: str | None = Query(default=None),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return purchase_service.list_purchases(
        db,
        business_id=business.id,
        supplier_id=supplier_id,
        date_from=date_from,
        date_to=date_to,
        invoice_number=invoice_number,
    )


@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase(
    purchase_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return purchase_service.get_purchase(
            db, business_id=business.id, purchase_id=purchase_id
        )
    except PurchaseNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")


@router.put("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(
    purchase_id: uuid.UUID,
    payload: PurchaseUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return _handle_item_errors(
            purchase_service.update_purchase,
            db,
            business_id=business.id,
            purchase_id=purchase_id,
            payload=payload,
        )
    except PurchaseNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        purchase_service.delete_purchase(db, business_id=business.id, purchase_id=purchase_id)
    except PurchaseNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")