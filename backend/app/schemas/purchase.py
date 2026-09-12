"""
Pydantic schemas for purchases and purchase items.

Purchase totals are calculated server-side by the purchase service.
The client does not provide subtotal or total_amount.

Payment fields are optional/defaulted so existing purchase requests
remain valid. The service can calculate/update these values as needed.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.supplier import SupplierResponse


# ============================================================
# PURCHASE ITEM CREATE
# ============================================================

class PurchaseItemCreate(BaseModel):
    """
    Data required to add one product to a purchase.

    For grocery products, product_variant_id can be omitted because
    the service resolves the product's implicit/single variant.

    For clothing products with multiple variants, the service requires
    product_variant_id so the correct size/color stock is updated.
    """

    product_id: uuid.UUID

    product_variant_id: uuid.UUID | None = None

    quantity: int = Field(gt=0)

    unit_cost: Decimal = Field(ge=0)


# ============================================================
# PURCHASE CREATE
# ============================================================

class PurchaseCreate(BaseModel):
    """
    Schema for creating a purchase.

    subtotal and total_amount are NEVER accepted from the client.
    They are calculated by the backend from:

        quantity × unit_cost
        → subtotal
        → discount
        → tax
        → total_amount

    Payment information is optional because a purchase can initially
    be created without payment details.
    """

    supplier_id: uuid.UUID | None = None

    purchase_date: date

    invoice_number: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None

    discount: Decimal = Field(
        default=Decimal("0"),
        ge=0,
    )

    tax: Decimal = Field(
        default=Decimal("0"),
        ge=0,
    )

    items: list[PurchaseItemCreate] = Field(
        min_length=1,
    )

    # --------------------------------------------------------
    # Payment fields
    # --------------------------------------------------------
    # These MUST have defaults.
    #
    # Your tests create purchases like:
    #
    # {
    #     "purchase_date": "...",
    #     "items": [...]
    # }
    #
    # Therefore these cannot be required request fields.
    # --------------------------------------------------------

    amount_paid: Decimal = Field(
        default=Decimal("0"),
        ge=0,
    )

    balance_due: Decimal | None = Field(
        default=None,
        ge=0,
    )

    payment_status: str = Field(
        default="UNPAID",
    )


# ============================================================
# PURCHASE UPDATE
# ============================================================

class PurchaseUpdate(BaseModel):
    """
    Full replacement of an existing purchase.

    Updating a purchase means:

    1. Reverse the old stock effect.
    2. Validate the new purchase items.
    3. Apply the new stock effect.
    4. Recalculate subtotal and total.
    5. Update payment information.

    subtotal and total_amount are calculated server-side.
    """

    supplier_id: uuid.UUID | None = None

    purchase_date: date

    invoice_number: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None

    discount: Decimal = Field(
        default=Decimal("0"),
        ge=0,
    )

    tax: Decimal = Field(
        default=Decimal("0"),
        ge=0,
    )

    items: list[PurchaseItemCreate] = Field(
        min_length=1,
    )

    amount_paid: Decimal = Field(
        default=Decimal("0"),
        ge=0,
    )

    balance_due: Decimal | None = Field(
        default=None,
        ge=0,
    )

    payment_status: str = Field(
        default="UNPAID",
    )


# ============================================================
# PURCHASE ITEM RESPONSE
# ============================================================

class PurchaseItemResponse(BaseModel):
    """
    Response returned for an individual purchase item.
    """

    id: uuid.UUID

    product_id: uuid.UUID

    product_variant_id: uuid.UUID | None

    product_name: str

    variant_label: str | None

    quantity: int

    unit_cost: Decimal

    total_cost: Decimal

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# PURCHASE RESPONSE
# ============================================================

class PurchaseResponse(BaseModel):
    """
    Complete purchase response.

    subtotal and total_amount are backend-calculated values.
    """

    id: uuid.UUID

    business_id: uuid.UUID

    supplier: SupplierResponse | None

    purchase_date: date

    invoice_number: str | None

    notes: str | None

    # --------------------------------------------------------
    # Server-calculated financial values
    # --------------------------------------------------------

    subtotal: Decimal

    discount: Decimal

    tax: Decimal

    total_amount: Decimal

    # --------------------------------------------------------
    # Payment information
    # --------------------------------------------------------

    amount_paid: Decimal

    balance_due: Decimal

    payment_status: str

    # --------------------------------------------------------
    # Items
    # --------------------------------------------------------

    items: list[PurchaseItemResponse]

    # --------------------------------------------------------
    # Timestamps
    # --------------------------------------------------------

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )