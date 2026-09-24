from sqlalchemy.orm import Session

from app.models.business import Business
from app.schemas.business import BusinessUpdate


def update_business(db: Session, *, business: Business, payload: BusinessUpdate) -> Business:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    return business