from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.insight import Insight
from app.services import insights_service

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])


@router.get("", response_model=list[Insight])
def get_insights(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return insights_service.get_business_insights(db, business_id=business.id)