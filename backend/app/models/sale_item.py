"""
SaleItem — one line of a Sale.

Unlike PurchaseItem (Phase 4), which reads product_name/variant_label
live off the current Product/ProductVariant via a relationship
property, SaleItem stores product_name and variant_label as actual
snapshot COLUMNS at the time of sale. This is deliberate: a sale's
historical record — and any profit report built on it — must stay
correct even if the product is later renamed, restyled, or deleted.

unit_cost is likewise a snapshot of the product's purchase_price at
the moment of sale — never recomputed later — so profit is always
"what did we actually make on this sale", not "what would we make if
we sold it today".
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_sale_item_unit_price_non_negative"),
        CheckConstraint("unit_cost >= 0", name="ck_sale_item_unit_cost_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    sale_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_variant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    variant_label: Mapped[str | None] = mapped_column(String(100), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")

    # Used internally by sale_service.py to reverse/reapply stock on
    # edit/delete — the response schema still reads product_name/
    # variant_label from the snapshot columns above, never through
    # this relationship.
    product_variant: Mapped["ProductVariant | None"] = relationship("ProductVariant")

    @property
    def profit(self) -> Decimal:
        """(unit_price - unit_cost) * quantity, using the snapshotted
        values — never today's product price."""
        return (self.unit_price - self.unit_cost) * self.quantity