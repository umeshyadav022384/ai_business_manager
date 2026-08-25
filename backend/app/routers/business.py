"""
Business-scoped routes. Phase 2 only needs one endpoint here: a way to
prove get_current_business (and therefore business_id isolation) works.
Real business-data endpoints (products, sales, etc.) come in later
phases, but they will all depend on get_current_business the same way
this one does.
"""

from fastapi import APIRouter, Depends

from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.auth import BusinessResponse

router = APIRouter(prefix="/api/v1/business", tags=["business"])


@router.get("/current", response_model=BusinessResponse)
def get_current_business_info(business: Business = Depends(get_current_business)):
    """
    Returns the business identified by the X-Business-Id header — but
    only if the authenticated user (from the JWT) is actually a member
    of it. This is the pattern every future business-scoped endpoint
    (products, sales, customers, ...) will follow.
    """
    return business