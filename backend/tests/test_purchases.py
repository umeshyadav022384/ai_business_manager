"""
Purchase creation, editing, deletion, stock transactions, and business
isolation tests. These are the most important tests in Phase 4 — a bug
here means either stock silently drifts, or one business's purchases
leak to another.
"""


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


def _create_grocery_product(client, token, business_id, name="Basmati Rice", stock=20):
    response = client.post(
        "/api/v1/products",
        headers=_auth_headers(token, business_id),
        json={
            "name": name,
            "purchase_price": 100,
            "selling_price": 130,
            "variants": [{"stock_quantity": stock}],
        },
    )
    data = response.json()
    return data["id"], data["variants"][0]["id"]


def _create_clothing_product(client, token, business_id, name="T-Shirt"):
    response = client.post(
        "/api/v1/products",
        headers=_auth_headers(token, business_id),
        json={
            "name": name,
            "purchase_price": 300,
            "selling_price": 500,
            "variants": [
                {"size": "M", "color": "Black", "stock_quantity": 5},
                {"size": "L", "color": "Black", "stock_quantity": 3},
            ],
        },
    )
    data = response.json()
    variants = {f"{v['size']}/{v['color']}": v["id"] for v in data["variants"]}
    return data["id"], variants


def _get_variant_stock(client, token, business_id, product_id, variant_id):
    response = client.get(
        f"/api/v1/products/{product_id}", headers=_auth_headers(token, business_id)
    )
    for v in response.json()["variants"]:
        if v["id"] == variant_id:
            return v["stock_quantity"]
    raise AssertionError("variant not found")


# ---------------------------------------------------------------------
# Purchase creation + stock increase
# ---------------------------------------------------------------------


def test_create_purchase_increases_grocery_stock(client):
    token, business_id = _register(client)
    product_id, variant_id = _create_grocery_product(client, token, business_id, stock=20)

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "invoice_number": "INV-001",
            "items": [{"product_id": product_id, "quantity": 10, "unit_cost": "120.00"}],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["items"][0]["total_cost"] == "1200.00"
    assert data["subtotal"] == "1200.00"
    assert data["total_amount"] == "1200.00"

    new_stock = _get_variant_stock(client, token, business_id, product_id, variant_id)
    assert new_stock == 30  # 20 + 10


def test_create_purchase_increases_clothing_variant_stock(client):
    token, business_id = _register(client, business_type="clothing")
    product_id, variants = _create_clothing_product(client, token, business_id)
    m_black_id = variants["M/Black"]

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [
                {
                    "product_id": product_id,
                    "product_variant_id": m_black_id,
                    "quantity": 10,
                    "unit_cost": "700.00",
                }
            ],
        },
    )
    assert response.status_code == 201

    new_stock = _get_variant_stock(client, token, business_id, product_id, m_black_id)
    assert new_stock == 15  # 5 + 10

    # The other variant (L/Black) must be untouched.
    l_black_stock = _get_variant_stock(client, token, business_id, product_id, variants["L/Black"])
    assert l_black_stock == 3


def test_purchase_requires_variant_for_ambiguous_clothing_product(client):
    token, business_id = _register(client, business_type="clothing")
    product_id, _variants = _create_clothing_product(client, token, business_id)

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_id, "quantity": 5, "unit_cost": "700.00"}],
        },
    )
    assert response.status_code == 400


def test_purchase_totals_include_discount_and_tax(client):
    token, business_id = _register(client)
    product_id, _variant_id = _create_grocery_product(client, token, business_id)

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "discount": "100.00",
            "tax": "50.00",
            "items": [{"product_id": product_id, "quantity": 10, "unit_cost": "120.00"}],
        },
    )
    data = response.json()
    assert data["subtotal"] == "1200.00"
    assert data["total_amount"] == "1150.00"  # 1200 - 100 + 50


def test_purchase_rejects_zero_quantity(client):
    token, business_id = _register(client)
    product_id, _variant_id = _create_grocery_product(client, token, business_id)

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_id, "quantity": 0, "unit_cost": "120.00"}],
        },
    )
    assert response.status_code == 422


def test_purchase_rejects_negative_unit_cost(client):
    token, business_id = _register(client)
    product_id, _variant_id = _create_grocery_product(client, token, business_id)

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_id, "quantity": 5, "unit_cost": "-1.00"}],
        },
    )
    assert response.status_code == 422


def test_purchase_with_invalid_product_fails_and_creates_nothing(client):
    """Transaction safety: an invalid item must fail the whole purchase,
    not partially create it or partially adjust stock."""
    token, business_id = _register(client)
    product_id, variant_id = _create_grocery_product(client, token, business_id, stock=20)
    fake_product_id = "00000000-0000-0000-0000-000000000000"

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [
                {"product_id": product_id, "quantity": 10, "unit_cost": "120.00"},
                {"product_id": fake_product_id, "quantity": 5, "unit_cost": "10.00"},
            ],
        },
    )
    assert response.status_code == 404

    # Stock must be unchanged — the valid first item must NOT have been
    # applied even though it was processed before the invalid second one.
    stock = _get_variant_stock(client, token, business_id, product_id, variant_id)
    assert stock == 20

    list_response = client.get("/api/v1/purchases", headers=_auth_headers(token, business_id))
    assert list_response.json() == []


def test_purchase_with_invalid_supplier_fails(client):
    token, business_id = _register(client)
    product_id, _variant_id = _create_grocery_product(client, token, business_id)
    fake_supplier_id = "00000000-0000-0000-0000-000000000000"

    response = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "supplier_id": fake_supplier_id,
            "items": [{"product_id": product_id, "quantity": 5, "unit_cost": "10.00"}],
        },
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------
# Purchase listing / detail
# ---------------------------------------------------------------------


def test_list_and_get_purchase(client):
    token, business_id = _register(client)
    product_id, _variant_id = _create_grocery_product(client, token, business_id)

    created = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "invoice_number": "INV-100",
            "items": [{"product_id": product_id, "quantity": 5, "unit_cost": "100.00"}],
        },
    ).json()

    list_response = client.get("/api/v1/purchases", headers=_auth_headers(token, business_id))
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    get_response = client.get(
        f"/api/v1/purchases/{created['id']}", headers=_auth_headers(token, business_id)
    )
    assert get_response.status_code == 200
    assert get_response.json()["invoice_number"] == "INV-100"
    assert get_response.json()["items"][0]["product_name"] == "Basmati Rice"


def test_list_purchases_filters_by_supplier(client):
    token, business_id = _register(client)
    product_id, _variant_id = _create_grocery_product(client, token, business_id)
    supplier = client.post(
        "/api/v1/suppliers", headers=_auth_headers(token, business_id), json={"name": "Supplier X"}
    ).json()

    client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "supplier_id": supplier["id"],
            "items": [{"product_id": product_id, "quantity": 5, "unit_cost": "100.00"}],
        },
    )
    client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_id, "quantity": 5, "unit_cost": "100.00"}],
        },
    )

    response = client.get(
        f"/api/v1/purchases?supplier_id={supplier['id']}",
        headers=_auth_headers(token, business_id),
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["supplier"]["id"] == supplier["id"]


# ---------------------------------------------------------------------
# Purchase editing — net stock change
# ---------------------------------------------------------------------


def test_update_purchase_applies_net_stock_change(client):
    """Original purchase: +10. Edited to: 15. Net effect must be +5
    from the pre-purchase baseline, not +10 then +15 (=+25)."""
    token, business_id = _register(client)
    product_id, variant_id = _create_grocery_product(client, token, business_id, stock=20)

    created = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_id, "quantity": 10, "unit_cost": "120.00"}],
        },
    ).json()
    assert _get_variant_stock(client, token, business_id, product_id, variant_id) == 30

    update_response = client.put(
        f"/api/v1/purchases/{created['id']}",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_id, "quantity": 15, "unit_cost": "120.00"}],
        },
    )
    assert update_response.status_code == 200
    assert _get_variant_stock(client, token, business_id, product_id, variant_id) == 35  # 20 + 15


def test_delete_purchase_reverses_stock(client):
    token, business_id = _register(client)
    product_id, variant_id = _create_grocery_product(client, token, business_id, stock=20)

    created = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token, business_id),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_id, "quantity": 10, "unit_cost": "120.00"}],
        },
    ).json()
    assert _get_variant_stock(client, token, business_id, product_id, variant_id) == 30

    delete_response = client.delete(
        f"/api/v1/purchases/{created['id']}", headers=_auth_headers(token, business_id)
    )
    assert delete_response.status_code == 204
    assert _get_variant_stock(client, token, business_id, product_id, variant_id) == 20

    get_response = client.get(
        f"/api/v1/purchases/{created['id']}", headers=_auth_headers(token, business_id)
    )
    assert get_response.status_code == 404


# ---------------------------------------------------------------------
# Business isolation — mandatory per Phase 4 spec
# ---------------------------------------------------------------------


def test_purchase_business_isolation(client):
    """Business A must never see, fetch, edit, or delete Business B's
    purchases — even by guessing/reusing a real purchase_id or trying
    to reuse Business B's product_id in a new purchase of their own."""
    token_a, business_a = _register(client, "owner_a2@shop.com", "grocery")
    token_b, business_b = _register(client, "owner_b2@shop.com", "clothing")

    product_b, variants_b = _create_clothing_product(client, token_b, business_b)
    variant_b_id = variants_b["M/Black"]

    purchase_b = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token_b, business_b),
        json={
            "purchase_date": "2026-08-26",
            "items": [
                {
                    "product_id": product_b,
                    "product_variant_id": variant_b_id,
                    "quantity": 5,
                    "unit_cost": "700.00",
                }
            ],
        },
    ).json()

    # Business A cannot read it.
    get_response = client.get(
        f"/api/v1/purchases/{purchase_b['id']}", headers=_auth_headers(token_a, business_a)
    )
    assert get_response.status_code == 404

    # Business A cannot edit it.
    update_response = client.put(
        f"/api/v1/purchases/{purchase_b['id']}",
        headers=_auth_headers(token_a, business_a),
        json={
            "purchase_date": "2026-08-26",
            "items": [
                {
                    "product_id": product_b,
                    "product_variant_id": variant_b_id,
                    "quantity": 999,
                    "unit_cost": "1.00",
                }
            ],
        },
    )
    assert update_response.status_code == 404

    # Business A cannot delete it.
    delete_response = client.delete(
        f"/api/v1/purchases/{purchase_b['id']}", headers=_auth_headers(token_a, business_a)
    )
    assert delete_response.status_code == 404

    # Business A cannot use Business B's product_id in their own purchase.
    create_with_foreign_product = client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token_a, business_a),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_b, "quantity": 1, "unit_cost": "1.00"}],
        },
    )
    assert create_with_foreign_product.status_code == 404

    # Business B's data is untouched by all of A's attempts.
    still_there = client.get(
        f"/api/v1/purchases/{purchase_b['id']}", headers=_auth_headers(token_b, business_b)
    )
    assert still_there.status_code == 200
    assert still_there.json()["items"][0]["quantity"] == 5


def test_business_a_list_never_includes_business_b_purchases(client):
    token_a, business_a = _register(client, "owner_a3@shop.com")
    token_b, business_b = _register(client, "owner_b3@shop.com")

    product_a, _ = _create_grocery_product(client, token_a, business_a)
    product_b, _ = _create_grocery_product(client, token_b, business_b)

    client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token_a, business_a),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_a, "quantity": 5, "unit_cost": "10.00"}],
        },
    )
    client.post(
        "/api/v1/purchases",
        headers=_auth_headers(token_b, business_b),
        json={
            "purchase_date": "2026-08-26",
            "items": [{"product_id": product_b, "quantity": 5, "unit_cost": "10.00"}],
        },
    )

    a_purchases = client.get(
        "/api/v1/purchases", headers=_auth_headers(token_a, business_a)
    ).json()
    b_purchases = client.get(
        "/api/v1/purchases", headers=_auth_headers(token_b, business_b)
    ).json()

    assert len(a_purchases) == 1
    assert len(b_purchases) == 1
    assert a_purchases[0]["id"] != b_purchases[0]["id"]