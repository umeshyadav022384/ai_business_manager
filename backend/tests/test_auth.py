"""
Auth flow tests.

Covers: registration, login (success/failure), the JWT containing only
user identity (no business_id), get_current_user / get_current_business
behavior, and — critically — that a user cannot read another business's
data even with a valid token, by supplying that business's id.
"""

import base64
import json
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import settings
from app.core.security import ALGORITHM


def _register_payload(email: str = "owner@shop.com") -> dict:
    return {
        "email": email,
        "password": "SecurePass123",
        "full_name": "Ram Shop Owner",
        "business_name": "Ram Kirana Store",
        "business_type": "grocery",
        "country": "Nepal",
        "currency": "NPR",
    }


# ---------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------


def test_register_creates_user_business_and_returns_token(client):
    response = client.post("/api/v1/auth/register", json=_register_payload())

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "owner@shop.com"
    assert "hashed_password" not in data["user"]
    assert data["business"]["name"] == "Ram Kirana Store"
    assert data["access_token"]
    assert data["token_type"] == "bearer"


def test_register_rejects_duplicate_email(client):
    client.post("/api/v1/auth/register", json=_register_payload())
    response = client.post("/api/v1/auth/register", json=_register_payload())

    assert response.status_code == 409


def test_register_rejects_short_password(client):
    payload = _register_payload()
    payload["password"] = "short"
    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 422


# ---------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------


def test_login_with_correct_credentials_returns_token(client):
    client.post("/api/v1/auth/register", json=_register_payload())

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@shop.com", "password": "SecurePass123"},
    )

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_with_wrong_password_is_rejected(client):
    client.post("/api/v1/auth/register", json=_register_payload())

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@shop.com", "password": "WrongPassword123"},
    )

    assert response.status_code == 401


def test_login_with_unknown_email_is_rejected(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@nowhere.com", "password": "whatever123"},
    )

    assert response.status_code == 401


# ---------------------------------------------------------------------
# JWT structure (architectural requirement: identity only, no business_id)
# ---------------------------------------------------------------------


def test_jwt_payload_contains_no_business_id(client):
    register_response = client.post("/api/v1/auth/register", json=_register_payload())
    token = register_response.json()["access_token"]

    payload_b64 = token.split(".")[1]
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded))

    assert "business_id" not in payload
    assert set(payload.keys()) == {"sub", "iat", "exp"}
    assert payload["sub"] == register_response.json()["user"]["id"]


def test_invalid_token_is_rejected(client):
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401


def test_expired_token_is_rejected(client):
    register_response = client.post("/api/v1/auth/register", json=_register_payload())
    user_id = register_response.json()["user"]["id"]

    expired_payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = jwt.encode(expired_payload, settings.secret_key, algorithm=ALGORITHM)

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401


def test_tampered_token_signature_is_rejected(client):
    register_response = client.post("/api/v1/auth/register", json=_register_payload())
    token = register_response.json()["access_token"]
    tampered = token[:-4] + "abcd"  # corrupt the signature

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"}
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------


def test_me_requires_authentication(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_returns_user_and_memberships(client):
    register_response = client.post("/api/v1/auth/register", json=_register_payload())
    token = register_response.json()["access_token"]
    business_id = register_response.json()["business"]["id"]

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "owner@shop.com"
    assert len(data["memberships"]) == 1
    assert data["memberships"][0]["business"]["id"] == business_id
    assert data["memberships"][0]["role"] == "owner"


# ---------------------------------------------------------------------
# GET /business/current — get_current_business behavior
# ---------------------------------------------------------------------


def test_business_current_requires_authentication(client):
    response = client.get("/api/v1/business/current")
    assert response.status_code == 401


def test_business_current_requires_business_id_header(client):
    register_response = client.post("/api/v1/auth/register", json=_register_payload())
    token = register_response.json()["access_token"]

    response = client.get(
        "/api/v1/business/current", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400


def test_business_current_returns_business_for_member(client):
    register_response = client.post("/api/v1/auth/register", json=_register_payload())
    token = register_response.json()["access_token"]
    business_id = register_response.json()["business"]["id"]

    response = client.get(
        "/api/v1/business/current",
        headers={"Authorization": f"Bearer {token}", "X-Business-Id": business_id},
    )

    assert response.status_code == 200
    assert response.json()["id"] == business_id


def test_business_current_rejects_nonexistent_business_id(client):
    register_response = client.post("/api/v1/auth/register", json=_register_payload())
    token = register_response.json()["access_token"]
    fake_business_id = "00000000-0000-0000-0000-000000000000"

    response = client.get(
        "/api/v1/business/current",
        headers={"Authorization": f"Bearer {token}", "X-Business-Id": fake_business_id},
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------
# Cross-tenant isolation — the critical security test
# ---------------------------------------------------------------------


def test_user_cannot_access_another_business(client):
    """
    User A must not be able to read Business B's data by supplying B's
    business_id in the header, even with a fully valid token for A.
    This is the test that proves get_current_business enforces
    BusinessMember-based isolation rather than trusting the header.
    """
    owner_a = client.post(
        "/api/v1/auth/register", json=_register_payload("owner_a@shop.com")
    )
    token_a = owner_a.json()["access_token"]

    payload_b = _register_payload("owner_b@shop.com")
    payload_b["business_name"] = "Sita Clothing Shop"
    payload_b["business_type"] = "clothing"
    owner_b = client.post("/api/v1/auth/register", json=payload_b)
    business_b_id = owner_b.json()["business"]["id"]

    response = client.get(
        "/api/v1/business/current",
        headers={"Authorization": f"Bearer {token_a}", "X-Business-Id": business_b_id},
    )

    assert response.status_code == 403


def test_each_owner_can_access_their_own_business_only(client):
    """Companion to the isolation test: confirms both A and B *can* each
    reach their own business, so the 403 above is really about
    isolation and not a broken endpoint."""
    owner_a = client.post(
        "/api/v1/auth/register", json=_register_payload("owner_a2@shop.com")
    )
    token_a = owner_a.json()["access_token"]
    business_a_id = owner_a.json()["business"]["id"]

    payload_b = _register_payload("owner_b2@shop.com")
    owner_b = client.post("/api/v1/auth/register", json=payload_b)
    token_b = owner_b.json()["access_token"]
    business_b_id = owner_b.json()["business"]["id"]

    response_a = client.get(
        "/api/v1/business/current",
        headers={"Authorization": f"Bearer {token_a}", "X-Business-Id": business_a_id},
    )
    response_b = client.get(
        "/api/v1/business/current",
        headers={"Authorization": f"Bearer {token_b}", "X-Business-Id": business_b_id},
    )

    assert response_a.status_code == 200
    assert response_a.json()["id"] == business_a_id
    assert response_b.status_code == 200
    assert response_b.json()["id"] == business_b_id