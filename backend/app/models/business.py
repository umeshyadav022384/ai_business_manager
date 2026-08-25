"""
Business model — a tenant. All business-owned data (products, sales,
customers, etc. in later phases) will carry a business_id FK pointing
here.

Note there is deliberately no owner_id column. Ownership is expressed as
a BusinessMember row with role="owner" — see business_member.py for why.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # "grocery" or "clothing" for now. Kept as a plain string rather than
    # a DB enum so adding a third business type later is a data change,
    # not a migration that alters an enum type.
    business_type: Mapped[str] = mapped_column(String(50), nullable=False)

    country: Mapped[str] = mapped_column(String(100), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    members: Mapped[list["BusinessMember"]] = relationship(
        "BusinessMember", back_populates="business", cascade="all, delete-orphan"
    )