"""
Pydantic schemas for authentication and business creation.

Kept separate from app.models: these define what the API accepts and
returns, not the database shape. Notably, UserResponse never includes
hashed_password, and RegisterRequest bundles "create a business" into
the same call since Phase 2 always creates exactly one owner-business
pair at registration (see services/auth_service.py).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.business_member import BusinessRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)

    # Business created for this user at registration time (role=owner).
    business_name: str = Field(min_length=1, max_length=255)
    business_type: str = Field(min_length=1, max_length=50)
    country: str = Field(min_length=1, max_length=100)
    currency: str = Field(min_length=1, max_length=10)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BusinessResponse(BaseModel):
    id: uuid.UUID
    name: str
    business_type: str
    country: str
    currency: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class MembershipResponse(BaseModel):
    business: BusinessResponse
    role: BusinessRole

    class Config:
        from_attributes = True


class RegisterResponse(BaseModel):
    user: UserResponse
    business: BusinessResponse
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    """Response for GET /api/v1/auth/me — the current user plus all
    businesses they belong to (Phase 2 will normally only ever show one,
    but the shape supports more without changing later)."""

    user: UserResponse
    memberships: list[MembershipResponse]