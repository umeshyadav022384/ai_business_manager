"""
User model — a login identity, not tied to a single business directly.

A user gains access to a business only through a BusinessMember row
(see business_member.py). This keeps "who can log in" separate from
"what business data can they see", which is what lets a user belong to
zero, one, or multiple businesses without reshaping this table.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Unique + indexed: this is the login identifier, looked up on every
    # login attempt, so it must be fast and must not collide.
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    # Never store plaintext. Only the bcrypt hash lives here.
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # One user can be a member of multiple businesses (e.g. an owner who
    # later also joins as staff elsewhere). Phase 1 UI only ever creates
    # one membership at registration, but the relationship supports more.
    memberships: Mapped[list["BusinessMember"]] = relationship(
        "BusinessMember", back_populates="user", cascade="all, delete-orphan"
    )