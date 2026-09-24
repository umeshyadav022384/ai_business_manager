def _register(client, email="grocer@shop.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email, "password": "SecurePass123", "full_name": "Test Owner",
            "business_name": "Test Shop", "business_type": "grocery",
            "country": "Nepal", "currency": "NPR",
        },
    )
    data = response.json()
    return data["access_token"], data["business"]["id"]


def _auth_headers(token, business_id):
    return {"Authorization": f"Bearer {token}", "X-Business-Id": business_id}


def test_update_business_profile(client):
    token, business_id = _register(client)
    response = client.put(
        "/api/v1/business/current", headers=_auth_headers(token, business_id),
        json={"name": "Renamed Shop", "country": "India", "currency": "INR"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Renamed Shop"
    assert data["country"] == "India"
    assert data["currency"] == "INR"
    assert data["business_type"] == "grocery"  # unchanged — not in the update schema


def test_update_business_profile_partial(client):
    token, business_id = _register(client)
    response = client.put(
        "/api/v1/business/current", headers=_auth_headers(token, business_id),
        json={"name": "Only Name Changed"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Only Name Changed"
    assert data["country"] == "Nepal"  # untouched


def test_update_user_profile(client):
    token, business_id = _register(client)
    response = client.put(
        "/api/v1/auth/me", headers=_auth_headers(token, business_id),
        json={"full_name": "New Name"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "New Name"


def test_change_password_success_and_relogin(client):
    token, business_id = _register(client)
    response = client.post(
        "/api/v1/auth/change-password", headers=_auth_headers(token, business_id),
        json={"current_password": "SecurePass123", "new_password": "NewSecurePass456"},
    )
    assert response.status_code == 204

    old_login = client.post(
        "/api/v1/auth/login", json={"email": "grocer@shop.com", "password": "SecurePass123"}
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login", json={"email": "grocer@shop.com", "password": "NewSecurePass456"}
    )
    assert new_login.status_code == 200


def test_change_password_rejects_wrong_current_password(client):
    token, business_id = _register(client)
    response = client.post(
        "/api/v1/auth/change-password", headers=_auth_headers(token, business_id),
        json={"current_password": "WrongPassword", "new_password": "NewSecurePass456"},
    )
    assert response.status_code == 400


def test_settings_business_isolation(client):
    token_a, business_a = _register(client, "owner_a2@shop.com")
    token_b, business_b = _register(client, "owner_b2@shop.com")

    response = client.put(
        "/api/v1/business/current",
        headers={"Authorization": f"Bearer {token_a}", "X-Business-Id": business_b},
        json={"name": "Hijacked"},
    )
    # get_current_business rejects this before update logic ever runs —
    # Business A has no BusinessMember row for Business B.
    assert response.status_code == 403