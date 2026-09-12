"""
Sale model — the mirror image of Purchase (Phase 4): inventory leaves
the business instead of entering it. customer_id is nullable — a
walk-in customer with no record is a valid, common case for small
retail.

invoice_number is unique per business (not globally) — two different
businesses numbering their own invoices "INV-001" is normal and must
never collide, since they're different tenants entirely.
"""

import uuid
from datetime import date as date_type
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("business_id", "invoice_number", name="uq_sale_business_invoice"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sale_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    # Payment tracking (Phase 6). amount_paid/balance_due/payment_status
    # are set once at create/update time (see sale_service.py) from the
    # total at that moment — a snapshot of "what was due when this sale
    # was recorded", not a live-updating field. A customer's running
    # balance is computed by summing balance_due across all their
    # non-cancelled sales minus their payments (see
    # customer_payment_service.py) — deliberately NOT cached here.
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

    items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by="SaleItem.created_at",
    )

    customer: Mapped["Customer | None"] = relationship("Customer")

    @property
    def total_profit(self) -> Decimal:
        """Sum of every item's profit, using each item's snapshotted
        unit_price/unit_cost — never today's product price."""
        return sum((item.profit for item in self.items), Decimal("0.00"))