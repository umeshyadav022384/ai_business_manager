"""
Auth business logic. Routers call these functions rather than touching
the DB or models directly (per the layered architecture: routers are
thin, services hold logic).
"""

import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.business import Business
from app.models.business_member import BusinessMember, BusinessRole
from app.models.user import User


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def register_user_with_business(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    business_name: str,
    business_type: str,
    country: str,
    currency: str,
) -> tuple[User, Business]:
    """
    Creates a User, a Business, and a BusinessMember(role=owner) linking
    them — all in one transaction. If any part fails, nothing is
    committed, so we never end up with a user who has no business or a
    business with no owner.
    """
    user = User(
        email=email.lower(),
        hashed_password=hash_password(password),
        full_name=full_name,
    )
    business = Business(
        name=business_name,
        business_type=business_type,
        country=country,
        currency=currency,
    )

    db.add(user)
    db.add(business)
    try:
        # Flush (not commit) so both rows get their generated IDs and
        # any DB-level constraint violations (like the unique email)
        # surface here, before we create the membership row.
        db.flush()
    except IntegrityError:
        db.rollback()
        raise EmailAlreadyRegisteredError("Email is already registered")

    membership = BusinessMember(
        user_id=user.id,
        business_id=business.id,
        role=BusinessRole.OWNER,
    )
    db.add(membership)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise EmailAlreadyRegisteredError("Email is already registered")

    db.refresh(user)
    db.refresh(business)
    return user, business


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    """Returns the User if credentials are valid, else raises.

    Deliberately raises the same error for "no such user" and "wrong
    password" so a login failure doesn't reveal which part was wrong —
    that would let an attacker enumerate registered emails.
    """
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Invalid email or password")
    return user


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()