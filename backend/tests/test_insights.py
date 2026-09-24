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


def test_insights_returns_empty_list_for_new_business(client):
    token, business_id = _register(client)
    response = client.get("/api/v1/insights", headers=_auth_headers(token, business_id))
    assert response.status_code == 200
    assert response.json() == []


def test_low_stock_insight_appears(client):
    token, business_id = _register(client)
    client.post(
        "/api/v1/products", headers=_auth_headers(token, business_id),
        json={"name": "Rice", "purchase_price": 10, "selling_price": 15,
              "reorder_level": 10, "variants": [{"stock_quantity": 2}]},
    )
    response = client.get("/api/v1/insights", headers=_auth_headers(token, business_id))
    types = [i["type"] for i in response.json()]
    assert "low_stock" in types


def test_udhaar_insight_appears_when_customer_owes_money(client):
    token, business_id = _register(client)
    product = client.post(
        "/api/v1/products", headers=_auth_headers(token, business_id),
        json={"name": "Rice", "purchase_price": 10, "selling_price": 15,
              "variants": [{"stock_quantity": 100}]},
    ).json()
    customer = client.post(
        "/api/v1/customers", headers=_auth_headers(token, business_id), json={"name": "Ram"}
    ).json()
    client.post(
        "/api/v1/sales", headers=_auth_headers(token, business_id),
        json={"customer_id": customer["id"], "sale_date": "2026-09-02", "amount_paid": "0",
              "items": [{"product_id": product["id"], "quantity": 5, "unit_price": "15.00"}]},
    )
    response = client.get("/api/v1/insights", headers=_auth_headers(token, business_id))
    types = [i["type"] for i in response.json()]
    assert "customer_udhaar" in types


def test_insights_business_isolation(client):
    """Business A's insights must never reference Business B's data."""
    token_a, business_a = _register(client, "owner_a@shop.com")
    token_b, business_b = _register(client, "owner_b@shop.com")

    product_b = client.post(
        "/api/v1/products", headers=_auth_headers(token_b, business_b),
        json={"name": "Business B Secret Product", "purchase_price": 10, "selling_price": 15,
              "reorder_level": 100, "variants": [{"stock_quantity": 0}]},
    ).json()

    response_a = client.get("/api/v1/insights", headers=_auth_headers(token_a, business_a))
    assert response_a.status_code == 200
    for insight in response_a.json():
        assert "Business B Secret Product" not in insight["message"]
        assert "Business B Secret Product" not in insight["title"]