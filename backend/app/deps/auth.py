"""
Authentication and authorization dependencies.

get_current_user: decodes the JWT (identity only — see core/security.py
for why it carries no business_id) and loads the User row.

get_current_business: the ONLY place business access is decided. It
takes the current user plus a business_id the client is asking to act
on (via a header — see below) and verifies a BusinessMember row exists
linking that user to that business. If no such row exists, the request
is rejected with 403, regardless of whether the business itself exists.
This is what makes it impossible for one business's data to leak to
another: nothing downstream ever trusts a client-supplied business_id
without this check happening first.
"""

import uuid

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import InvalidTokenError, decode_access_token
from app.models.business import Business
from app.models.business_member import BusinessMember
from app.models.user import User

# tokenUrl is only used by FastAPI's auto-generated docs (Swagger "Authorize"
# button) to know where to POST for a token — it doesn't affect runtime
# behavior of this dependency.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        user_id = decode_access_token(token)
    except InvalidTokenError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_business(
    x_business_id: uuid.UUID | None = Header(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Business:
    """
    Resolves which business the current request is acting on, and
    proves (via BusinessMember) that the current user is actually a
    member of it.

    The business_id is supplied by the client via the X-Business-Id
    header — but it is never trusted on its own. It only determines
    *which* of the user's businesses is being addressed; whether the
    user may access it at all is decided by the BusinessMember lookup
    below, not by the header's presence.
    """
    if x_business_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Business-Id header is required",
        )

    membership = (
        db.query(BusinessMember)
        .filter(
            BusinessMember.user_id == current_user.id,
            BusinessMember.business_id == x_business_id,
        )
        .first()
    )

    if membership is None:
        # Same status for "business doesn't exist" and "user isn't a
        # member of it" — do not reveal which, to avoid leaking whether
        # a given business_id exists at all.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this business",
        )

    business = db.query(Business).filter(Business.id == x_business_id).first()
    if business is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this business",
        )

    return business