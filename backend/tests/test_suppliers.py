"""Supplier CRUD and business isolation tests."""


def _register(client, email="grocer@shop.com", business_type="grocery"):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123",
            "full_name": "Test Owner",
            "business_name": "Test Shop",
            "business_type": business_type,
            "country": "Nepal",
            "currency": "NPR",
        },
    )
    data = response.json()
    return data["access_token"], data["business"]["id"]


def _auth_headers(token, business_id):
    return {"Authorization": f"Bearer {token}", "X-Business-Id": business_id}


def test_create_supplier(client):
    token, business_id = _register(client)
    response = client.post(
        "/api/v1/suppliers",
        headers=_auth_headers(token, business_id),
        json={"name": "ABC Traders", "phone": "9800000000"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "ABC Traders"
    assert data["phone"] == "9800000000"
    assert data["business_id"] == business_id


def test_create_supplier_requires_name(client):
    token, business_id = _register(client)
    response = client.post(
        "/api/v1/suppliers", headers=_auth_headers(token, business_id), json={"name": ""}
    )
    assert response.status_code == 422


def test_list_suppliers(client):
    token, business_id = _register(client)
    client.post(
        "/api/v1/suppliers", headers=_auth_headers(token, business_id), json={"name": "A Supplier"}
    )
    client.post(
        "/api/v1/suppliers", headers=_auth_headers(token, business_id), json={"name": "B Supplier"}
    )
    response = client.get("/api/v1/suppliers", headers=_auth_headers(token, business_id))
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_update_supplier(client):
    token, business_id = _register(client)
    created = client.post(
        "/api/v1/suppliers", headers=_auth_headers(token, business_id), json={"name": "Old Name"}
    ).json()
    response = client.put(
        f"/api/v1/suppliers/{created['id']}",
        headers=_auth_headers(token, business_id),
        json={"name": "New Name", "phone": "111"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
    assert response.json()["phone"] == "111"


def test_delete_supplier(client):
    token, business_id = _register(client)
    created = client.post(
        "/api/v1/suppliers", headers=_auth_headers(token, business_id), json={"name": "To Delete"}
    ).json()
    response = client.delete(
        f"/api/v1/suppliers/{created['id']}", headers=_auth_headers(token, business_id)
    )
    assert response.status_code == 204

    get_response = client.get(
        f"/api/v1/suppliers/{created['id']}", headers=_auth_headers(token, business_id)
    )
    assert get_response.status_code == 404


def test_supplier_business_isolation(client):
    """Business A must not see, update, or delete Business B's supplier."""
    token_a, business_a = _register(client, "owner_a@shop.com")
    token_b, business_b = _register(client, "owner_b@shop.com")

    supplier_b = client.post(
        "/api/v1/suppliers",
        headers=_auth_headers(token_b, business_b),
        json={"name": "Business B Supplier"},
    ).json()

    get_response = client.get(
        f"/api/v1/suppliers/{supplier_b['id']}", headers=_auth_headers(token_a, business_a)
    )
    assert get_response.status_code == 404

    update_response = client.put(
        f"/api/v1/suppliers/{supplier_b['id']}",
        headers=_auth_headers(token_a, business_a),
        json={"name": "Hijacked"},
    )
    assert update_response.status_code == 404

    delete_response = client.delete(
        f"/api/v1/suppliers/{supplier_b['id']}", headers=_auth_headers(token_a, business_a)
    )
    assert delete_response.status_code == 404

    # Confirm it's untouched from Business B's own perspective.
    still_there = client.get(
        f"/api/v1/suppliers/{supplier_b['id']}", headers=_auth_headers(token_b, business_b)
    )
    assert still_there.status_code == 200
    assert still_there.json()["name"] == "Business B Supplier"