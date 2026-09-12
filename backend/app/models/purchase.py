"""
Purchase model — a single inventory-receiving event: a supplier
delivers some quantity of products, and the business's stock increases
as a result (see services/purchase_service.py for the transaction that
does this).

supplier_id is nullable and ON DELETE SET NULL — deleting a supplier
must not destroy purchase history, it should just orphan the
reference. business_id is NOT NULL and ON DELETE CASCADE, same as
every other business-owned table.

Money fields use NUMERIC (via Python Decimal), never float — floats
cannot represent currency exactly and would eventually produce
mismatched totals.

No currency column here: currency is a property of the Business
(Business.currency, Phase 2), not repeated per purchase. Formatting a
purchase's amounts in the business's currency is a frontend/display
concern.
"""

import uuid
from datetime import date as date_type
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    purchase_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # All computed server-side in purchase_service.py — never trusted
    # as authoritative if a client happens to send them.
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    # Payment tracking (Phase 6) — same pattern as Sale's fields.
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    balance_due: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    payment_status: Mapped[str] = mapped_column(String(20), nullable=False, default="paid")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items: Mapped[list["PurchaseItem"]] = relationship(
        "PurchaseItem",
        back_populates="purchase",
        cascade="all, delete-orphan",
        order_by="PurchaseItem.created_at",
    )

    # One-directional: Supplier doesn't need to know about its
    # purchases for anything built so far, so no back_populates.
    supplier: Mapped["Supplier | None"] = relationship("Supplier")