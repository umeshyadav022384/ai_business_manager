from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.report import FinancialSummaryResponse
from app.services import report_service

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/summary", response_model=FinancialSummaryResponse)
def get_financial_summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return report_service.get_financial_summary(
        db, business_id=business.id, date_from=date_from, date_to=date_to
    )