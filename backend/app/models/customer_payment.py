"""
CustomerPayment — a payment received from a customer, reducing their
overall outstanding balance (accounts receivable / Udhaar).

Deliberately NOT tied to reducing one specific Sale's balance_due:
sale_id is optional/informational only (which invoice this payment was
"for", for ledger display), not a foreign key the balance calculation
depends on. The customer's outstanding balance is always:

    SUM(sale.balance_due for non-cancelled sales) - SUM(payments.amount)

This is what makes cancelling a sale safe without having to touch any
payment record: the cancelled sale's balance_due simply drops out of
the first sum.
"""

import uuid
from datetime import date as date_type
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CustomerPayment(Base):
    __tablename__ = "customer_payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_customer_payment_amount_positive"),
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
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, default="cash")
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )