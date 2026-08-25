"""
Product model — shared by grocery and clothing businesses. Business-
type-specific fields (unit, expiry_date) are simply nullable columns
rather than separate tables per type; a grocery product uses them,
a clothing product leaves them NULL. This is what keeps grocery and
clothing on one schema instead of two.

Stock is deliberately NOT stored here — see ProductVariant. Every
product, regardless of type, has at least one variant; grocery
products get exactly one (see services/product_service.py).
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Grocery-only fields. NULL for clothing products.
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    purchase_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Low-stock alert threshold. Works the same way for either business
    # type since it's compared against ProductVariant.stock_quantity,
    # not a type-specific field.
    reorder_level: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    variants: Mapped[list["ProductVariant"]] = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.created_at",
    )