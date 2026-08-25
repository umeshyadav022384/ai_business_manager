"""
Authentication routes. Thin — all logic lives in services/auth_service.py
and core/security.py; this file just parses requests and shapes
responses.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.deps.auth import get_current_user
from app.models.business_member import BusinessMember
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    MembershipResponse,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    authenticate_user,
    register_user_with_business,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Creates a User, a Business, and a BusinessMember(role=owner) in one
    transaction, then returns an access token so the frontend can log
    the user straight in without a second round trip.
    """
    try:
        user, business = register_user_with_business(
            db,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            business_name=payload.business_name,
            business_type=payload.business_type,
            country=payload.country,
            currency=payload.currency,
        )
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    access_token = create_access_token(user.id)
    return RegisterResponse(
        user=user,
        business=business,
        access_token=access_token,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = authenticate_user(db, email=payload.email, password=payload.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns the current user and every business they're a member of.
    Requires only a valid JWT — no X-Business-Id header — since this
    endpoint's job is precisely to tell the frontend which businesses
    are available to pick from.
    """
    memberships = (
        db.query(BusinessMember).filter(BusinessMember.user_id == current_user.id).all()
    )
    return MeResponse(
        user=current_user,
        memberships=[
            MembershipResponse(business=m.business, role=m.role) for m in memberships
        ],
    )