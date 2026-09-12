import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.sale import SaleCreate, SaleResponse, SaleUpdate
from app.services import sale_service
from app.services.sale_service import (
    CustomerNotFoundError,
    InsufficientStockError,
    ProductNotFoundError,
    SaleNotFoundError,
    VariantNotFoundError,
    VariantRequiredError,
)

router = APIRouter(prefix="/api/v1/sales", tags=["sales"])


def _handle_item_errors(fn, *args, **kwargs):
    """Runs a service call, translating its validation exceptions into
    the right HTTP status — shared by create and update, mirroring
    routers/purchase.py's _handle_item_errors."""
    try:
        return fn(*args, **kwargs)
    except (ProductNotFoundError, VariantNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except VariantRequiredError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except InsufficientStockError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except CustomerNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return _handle_item_errors(
        sale_service.create_sale, db, business_id=business.id, payload=payload
    )


@router.get("", response_model=list[SaleResponse])
def list_sales(
    customer_id: uuid.UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    invoice_number: str | None = Query(default=None),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return sale_service.list_sales(
        db,
        business_id=business.id,
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
        invoice_number=invoice_number,
    )


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return sale_service.get_sale(db, business_id=business.id, sale_id=sale_id)
    except SaleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")


@router.put("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: uuid.UUID,
    payload: SaleUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return _handle_item_errors(
            sale_service.update_sale,
            db,
            business_id=business.id,
            sale_id=sale_id,
            payload=payload,
        )
    except SaleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        sale_service.delete_sale(db, business_id=business.id, sale_id=sale_id)
    except SaleNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")