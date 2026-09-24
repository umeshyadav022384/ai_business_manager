"""
AI Assistant tests. Uses a FakeLLMProvider (no real Gemini calls) so
these run without a GEMINI_API_KEY and never touch the network —
what's actually under test is business_id isolation in tools/RAG and
the orchestration flow, not Gemini itself.
"""

import uuid

from app.ai.llm_provider import LLMResponse, ToolCall
from app.ai.rag_service import index_document, query_business_knowledge
from app.main import app
from app.routers.ai_assistant import get_llm_provider


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


class FakeLLMProvider:
    """Deterministic stand-in for GeminiProvider. `plan` is a list of
    LLMResponse objects returned in order across generate()/
    generate_after_tool_result() calls, simulating a scripted
    conversation without any real model."""

    def __init__(self, plan: list[LLMResponse]):
        self._plan = list(plan)

    def generate(self, messages, rag_context):
        self.last_rag_context = rag_context
        return self._plan.pop(0)

    def generate_after_tool_result(self, messages, tool_call, tool_result):
        self.last_tool_result = tool_result
        return self._plan.pop(0)


def _override_llm(provider):
    app.dependency_overrides[get_llm_provider] = lambda: provider


def _clear_llm_override():
    app.dependency_overrides.pop(get_llm_provider, None)


def test_ai_requires_authentication(client):
    response = client.post("/api/v1/ai-assistant/ask", json={"question": "What were my sales?"})
    assert response.status_code == 401


def test_tool_calling_flow_returns_real_data_not_fabricated(client):
    token, business_id = _register(client)
    product = client.post(
        "/api/v1/products", headers=_auth_headers(token, business_id),
        json={"name": "Rice", "purchase_price": 10, "selling_price": 15,
              "reorder_level": 50, "variants": [{"stock_quantity": 5}]},
    ).json()

    fake = FakeLLMProvider(
        plan=[
            LLMResponse(tool_call=ToolCall(name="get_low_stock_products", arguments={})),
            LLMResponse(text="Your Rice is low on stock: 5 units left, reorder level is 50."),
        ]
    )
    _override_llm(fake)
    try:
        response = client.post(
            "/api/v1/ai-assistant/ask",
            headers=_auth_headers(token, business_id),
            json={"question": "Which products are low in stock?"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tools_used"] == ["get_low_stock_products"]
        # The real tool result (fed back to the fake LLM) must contain
        # the real database numbers, not anything the "LLM" invented.
        assert fake.last_tool_result["low_stock_products"][0]["product_name"] == "Rice"
        assert fake.last_tool_result["low_stock_products"][0]["current_stock"] == 5
    finally:
        _clear_llm_override()


def test_tool_dispatch_ignores_business_id_in_llm_arguments(client):
    """Even if the 'LLM' tries to smuggle a business_id into the tool
    call arguments, dispatch_tool must ignore it and use only the
    server-resolved business_id."""
    token_a, business_a = _register(client, "owner_a@shop.com")
    token_b, business_b = _register(client, "owner_b@shop.com")

    client.post(
        "/api/v1/products", headers=_auth_headers(token_b, business_b),
        json={"name": "Business B Secret Item", "purchase_price": 10, "selling_price": 15,
              "reorder_level": 100, "variants": [{"stock_quantity": 0}]},
    )

    fake = FakeLLMProvider(
        plan=[
            LLMResponse(
                tool_call=ToolCall(
                    name="get_low_stock_products",
                    arguments={"business_id": business_b},  # malicious/confused LLM output
                )
            ),
            LLMResponse(text="Here is your low stock."),
        ]
    )
    _override_llm(fake)
    try:
        response = client.post(
            "/api/v1/ai-assistant/ask",
            headers=_auth_headers(token_a, business_a),
            json={"question": "Which products are low in stock?"},
        )
        assert response.status_code == 200
        product_names = [p["product_name"] for p in fake.last_tool_result["low_stock_products"]]
        assert "Business B Secret Item" not in product_names
    finally:
        _clear_llm_override()


def test_postgres_tool_isolation_directly(client):
    """Direct unit-level check on the tools themselves, bypassing the
    LLM entirely: Business A's tool call must never surface Business
    B's rows, even if called with Business A's own session/business_id."""
    from app.ai.tools import get_customer_udhaar
    from app.core.database import SessionLocal

    token_a, business_a = _register(client, "owner_a2@shop.com")
    token_b, business_b = _register(client, "owner_b2@shop.com")

    product_b = client.post(
        "/api/v1/products", headers=_auth_headers(token_b, business_b),
        json={"name": "B Item", "purchase_price": 10, "selling_price": 15,
              "variants": [{"stock_quantity": 100}]},
    ).json()
    customer_b = client.post(
        "/api/v1/customers", headers=_auth_headers(token_b, business_b), json={"name": "B Customer"}
    ).json()
    client.post(
        "/api/v1/sales", headers=_auth_headers(token_b, business_b),
        json={"customer_id": customer_b["id"], "sale_date": "2026-09-02", "amount_paid": "0",
              "items": [{"product_id": product_b["id"], "quantity": 1, "unit_price": "15.00"}]},
    )

    db = SessionLocal()
    try:
        result_a = get_customer_udhaar(db, business_id=uuid.UUID(business_a))
        assert result_a["customers_with_due"] == []
        result_b = get_customer_udhaar(db, business_id=uuid.UUID(business_b))
        assert len(result_b["customers_with_due"]) == 1
    finally:
        db.close()


def test_chromadb_metadata_isolation():
    business_a = uuid.uuid4()
    business_b = uuid.uuid4()

    index_document(
        business_id=business_a, document_type="product", source="products",
        doc_id=f"test-a-{business_a}", text="Product: Business A Exclusive Widget.",
    )
    index_document(
        business_id=business_b, document_type="product", source="products",
        doc_id=f"test-b-{business_b}", text="Product: Business B Exclusive Widget.",
    )

    results_a = query_business_knowledge(business_id=business_a, query_text="Widget", n_results=5)
    assert any("Business A Exclusive" in r for r in results_a)
    assert not any("Business B Exclusive" in r for r in results_a)

    results_b = query_business_knowledge(business_id=business_b, query_text="Widget", n_results=5)
    assert any("Business B Exclusive" in r for r in results_b)
    assert not any("Business A Exclusive" in r for r in results_b)


def test_rag_flow_passes_business_scoped_context_to_llm(client):
    token, business_id = _register(client)
    client.post(
        "/api/v1/products", headers=_auth_headers(token, business_id),
        json={"name": "Special Widget", "category": "Hardware", "purchase_price": 10,
              "selling_price": 15, "variants": [{"stock_quantity": 10}]},
    )
    client.post("/api/v1/ai-assistant/reindex", headers=_auth_headers(token, business_id))

    fake = FakeLLMProvider(plan=[LLMResponse(text="Special Widget is a Hardware category product.")])
    _override_llm(fake)
    try:
        response = client.post(
            "/api/v1/ai-assistant/ask",
            headers=_auth_headers(token, business_id),
            json={"question": "Tell me about the Special Widget product."},
        )
        assert response.status_code == 200
        assert any("Special Widget" in c for c in fake.last_rag_context)
    finally:
        _clear_llm_override()


def test_refusal_when_no_relevant_data(client):
    token, business_id = _register(client)
    fake = FakeLLMProvider(
        plan=[LLMResponse(text="I don't have any sales data yet to answer that question.")]
    )
    _override_llm(fake)
    try:
        response = client.post(
            "/api/v1/ai-assistant/ask",
            headers=_auth_headers(token, business_id),
            json={"question": "What was my profit last year?"},
        )
        assert response.status_code == 200
        assert "don't have" in response.json()["answer"].lower()
    finally:
        _clear_llm_override()


def test_not_configured_returns_clear_message_without_crashing(client):
    """When GEMINI_API_KEY isn't set (the default in a fresh test env),
    the endpoint must degrade gracefully rather than 500."""
    _clear_llm_override()  # use the REAL get_llm_provider, which raises NotConfiguredError
    token, business_id = _register(client, "noaikey@shop.com")
    response = client.post(
        "/api/v1/ai-assistant/ask",
        headers=_auth_headers(token, business_id),
        json={"question": "What were my sales?"},
    )
    assert response.status_code == 200
    assert "not configured" in response.json()["answer"].lower()