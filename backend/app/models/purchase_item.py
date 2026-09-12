"""
PurchaseItem — one line of a Purchase: a quantity of a specific
product (and, for clothing, a specific variant) received at a given
unit cost.

product_variant_id is nullable at the schema level, but
services/purchase_service.py never actually leaves it unresolved: for
a grocery product (exactly one implicit variant) it auto-resolves to
that variant; for a clothing product with more than one variant, the
caller must specify which one. The column stays nullable because
"unresolved" is a real, if transient, state during request validation
before the service picks a variant — not because a purchase item is
ever persisted without one.

total_cost is stored (not recomputed on every read) so purchase
history remains numerically exact even if a product's price changes
later — it reflects what was actually paid at the time, not today's
price.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_purchase_item_quantity_positive"),
        CheckConstraint("unit_cost >= 0", name="ck_purchase_item_unit_cost_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchases.id", ondelete="CASCADE"),
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

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    purchase: Mapped["Purchase"] = relationship("Purchase", back_populates="items")

    # One-directional: Product/ProductVariant don't need to know about
    # purchase history for anything built so far, so no back_populates
    # was added on those models.
    product: Mapped["Product"] = relationship("Product")
    product_variant: Mapped["ProductVariant | None"] = relationship("ProductVariant")

    @property
    def product_name(self) -> str:
        """Lets PurchaseItemResponse read a display name straight off
        the ORM object via from_attributes, without the router having
        to assemble it manually."""
        return self.product.name

    @property
    def variant_label(self) -> str | None:
        """e.g. 'M / Black' for clothing, or None for grocery's
        size=None/color=None implicit variant."""
        if self.product_variant is None:
            return None
        parts = [p for p in (self.product_variant.size, self.product_variant.color) if p]
        return " / ".join(parts) if parts else None