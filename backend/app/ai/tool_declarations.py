"""
Gemini function-calling declarations for every tool in ai/tools.py.

IMPORTANT: business_id is deliberately NOT a parameter in any of these
declarations. The LLM has no way to supply it, because it never sees
that such a parameter exists — assistant_service.dispatch_tool()
injects the authenticated business_id itself when it calls the real
Python function. This is what makes "never trust business_id from the
LLM" true by construction rather than by convention.
"""

TOOL_DECLARATIONS = [
    {
        "name": "get_sales_summary",
        "description": "Get total sales revenue and number of sales for an optional date range.",
        "parameters": {
            "type": "object",
            "properties": {
                "date_from": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
                "date_to": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
            },
        },
    },
    {
        "name": "get_purchase_summary",
        "description": "Get total purchase amount and number of purchases for an optional date range.",
        "parameters": {
            "type": "object",
            "properties": {
                "date_from": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
                "date_to": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
            },
        },
    },
    {
        "name": "get_top_products",
        "description": "Get the best-selling products over the last 30 days, ranked by quantity sold.",
        "parameters": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "description": "How many products to return, default 5"}},
        },
    },
    {
        "name": "get_low_stock_products",
        "description": "Get products that are at or below their reorder level and should be restocked.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_customer_udhaar",
        "description": "Get total outstanding customer credit (Udhaar) and which customers owe money.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_supplier_payables",
        "description": "Get total outstanding amount owed to suppliers and which suppliers are owed money.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_expenses",
        "description": "Get total expenses and the highest individual expenses for an optional date range.",
        "parameters": {
            "type": "object",
            "properties": {
                "date_from": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
                "date_to": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
            },
        },
    },
    {
        "name": "get_profit_summary",
        "description": "Get revenue, cost of goods sold, gross profit, expenses, and net profit for an optional date range.",
        "parameters": {
            "type": "object",
            "properties": {
                "date_from": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
                "date_to": {"type": "string", "description": "ISO date (YYYY-MM-DD), optional"},
            },
        },
    },
    {
        "name": "get_recent_sales",
        "description": "Get the most recent sales transactions.",
        "parameters": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "description": "How many to return, default 5"}},
        },
    },
    {
        "name": "get_recent_purchases",
        "description": "Get the most recent purchase transactions.",
        "parameters": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "description": "How many to return, default 5"}},
        },
    },
    {
        "name": "get_product_information",
        "description": "Look up details (price, stock, category) for a specific product by name.",
        "parameters": {
            "type": "object",
            "properties": {"product_name": {"type": "string", "description": "Product name or partial name"}},
            "required": ["product_name"],
        },
    },
]