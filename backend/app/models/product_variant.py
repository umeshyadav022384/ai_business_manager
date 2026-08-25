"""
ProductVariant — the single source of truth for stock, for both
grocery and clothing products.

Every Product has at least one variant:
  - Clothing: one row per size/color combination (Black/S, Black/M...).
  - Grocery: exactly one row with size=NULL, color=NULL — an implicit
    "default" variant that just holds the product's stock_quantity.

This means stock logic (increment on purchase, decrement on sale,
low-stock comparisons — in later phases) never needs to branch on
business_type. It always operates on ProductVariant.stock_quantity.

business_id is duplicated here from Product.business_id on purpose —
see product.py's module docstring for why: it lets tenancy isolation
be enforced on this table directly, without relying on a join back to
Product being present in every query.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        # Prevents two identical Black/S rows on the same product.
        # For grocery's single implicit variant, both size and color
        # are NULL, and NULL is not considered equal to NULL by a
        # standard SQL unique constraint — so this does NOT block a
        # grocery product from ever having more than one NULL/NULL row.
        # The service layer is what guarantees "exactly one variant for
        # grocery" (see services/product_service.py); this constraint's
        # job is just clothing's Black/S deduplication.
        UniqueConstraint("product_id", "size", "color", name="uq_product_size_color"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)

    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    product: Mapped["Product"] = relationship("Product", back_populates="variants")