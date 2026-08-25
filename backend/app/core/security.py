"""
Password hashing and JWT helpers.

JWT design decision (per approved architecture): the token payload
carries ONLY the user's identity (sub = user_id) plus standard claims
(exp, iat). It never carries a business_id. Business access is always
re-resolved server-side from the BusinessMember table on each request
(see app/deps/auth.py) — this means a stale or tampered business claim
in a token is not even a possibility, because there isn't one.
"""

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: uuid.UUID) -> str:
    """Creates a JWT whose only identity claim is the user's id."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


class InvalidTokenError(Exception):
    """Raised when a token is malformed, expired, or has a bad signature."""


def decode_access_token(token: str) -> uuid.UUID:
    """Validates signature + expiration, then returns the user_id.

    python-jose's jwt.decode already verifies both the signature and the
    exp claim by default, raising JWTError on any failure (expired,
    tampered, malformed) — we don't need to check expiry manually.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise InvalidTokenError("Token is invalid or expired")

    sub = payload.get("sub")
    if sub is None:
        raise InvalidTokenError("Token is missing a subject claim")

    try:
        return uuid.UUID(sub)
    except ValueError:
        raise InvalidTokenError("Token subject is not a valid user id")