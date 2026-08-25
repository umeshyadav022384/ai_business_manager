"""
BusinessMember — the join between User and Business, and the single
source of truth for "can this user access this business's data".

This is the core of the tenancy model:

    User ──< BusinessMember >── Business

Every authorization check for business-scoped data goes through this
table (see app/deps/auth.py: get_current_business). A business_id
supplied by a client is never trusted on its own — it's only honored
if a BusinessMember row proves this user_id belongs to that
business_id.

`role` is stored now (owner/manager/staff) so that inviting staff later
is an additive feature — not a schema redesign. Phase 2 only ever
creates "owner" rows (one per business, at registration); permission
enforcement per role is out of scope until employee management ships.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BusinessRole(str, enum.Enum):
    OWNER = "owner"
    MANAGER = "manager"
    STAFF = "staff"


class BusinessMember(Base):
    __tablename__ = "business_members"
    __table_args__ = (
        # A given user can only have ONE membership row per business.
        # This is what makes "is this user a member of this business"
        # a simple existence check rather than something that could
        # return ambiguous/duplicate results.
        UniqueConstraint("user_id", "business_id", name="uq_user_business"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role: Mapped[BusinessRole] = mapped_column(
        Enum(BusinessRole, name="business_role"), nullable=False, default=BusinessRole.OWNER
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="memberships")
    business: Mapped["Business"] = relationship("Business", back_populates="members")