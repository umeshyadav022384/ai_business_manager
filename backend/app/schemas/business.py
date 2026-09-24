from pydantic import BaseModel, Field


class BusinessUpdate(BaseModel):
    """business_type is deliberately NOT included — it's immutable
    after registration. Changing grocery <-> clothing would invalidate
    every downstream assumption about Product/ProductVariant usage
    (unit/expiry vs size/color), so it's out of scope rather than
    silently allowed and half-supported."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    currency: str | None = Field(default=None, min_length=1, max_length=10)