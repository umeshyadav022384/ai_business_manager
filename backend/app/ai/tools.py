"""
AI Assistant tools — the ONLY way the LLM touches business data.

Every function here takes business_id as a required, server-supplied
keyword argument and does nothing else with it than pass it straight
into the same service-layer functions every other router already
uses (report_service, product_service, etc.). There is no code path
in this file that accepts business_id from the LLM or from the
request body — see ai/assistant_service.py's dispatch_tool(), which is
the only caller, and which always injects business_id itself.

Every return value is a plain, JSON-serializable dict (Decimal/date
converted to str) built directly from real database rows — nothing
here is text the LLM could have invented, so "the LLM never fabricates
numbers" is enforced by construction: numbers only ever reach the LLM
by flowing through one of these functions.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.supplier import Supplier
from app.services import customer_payment_service, report_service, supplier_payment_service


def _d(value) -> str:
    """Decimal/date -> str, so every tool result is trivially
    JSON-serializable for the LLM without a custom encoder."""
    return str(value)


def get_sales_summary(
    db: Session, *, business_id: uuid.UUID, date_from: str | None = None, date_to: str | None = None
) -> dict:
    parsed_from = date.fromisoformat(date_from) if date_from else None
    parsed_to = date.fromisoformat(date_to) if date_to else None
    summary = report_service.get_financial_summary(
        db, business_id=business_id, date_from=parsed_from, date_to=parsed_to
    )
    sales_count = (
        db.query(Sale)
        .filter(Sale.business_id == business_id)
        .filter(Sale.sale_date >= parsed_from if parsed_from else True)
        .filter(Sale.sale_date <= parsed_to if parsed_to else True)
        .count()
    )
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_revenue": _d(summary.revenue),
        "number_of_sales": sales_count,
    }


def get_purchase_summary(
    db: Session, *, business_id: uuid.UUID, date_from: str | None = None, date_to: str | None = None
) -> dict:
    query = db.query(Purchase).filter(Purchase.business_id == business_id)
    if date_from:
        query = query.filter(Purchase.purchase_date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Purchase.purchase_date <= date.fromisoformat(date_to))
    purchases = query.all()
    total = sum((p.total_amount for p in purchases), Decimal("0.00"))
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_purchase_amount": _d(total),
        "number_of_purchases": len(purchases),
    }


def get_top_products(db: Session, *, business_id: uuid.UUID, limit: int = 5) -> dict:
    thirty_days_ago = date.today() - timedelta(days=30)
    items = (
        db.query(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.business_id == business_id, Sale.sale_date >= thirty_days_ago)
        .all()
    )
    quantity_by_product: dict[str, int] = {}
    for item in items:
        quantity_by_product[item.product_name] = quantity_by_product.get(item.product_name, 0) + item.quantity
    ranked = sorted(quantity_by_product.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return {
        "period": "last 30 days",
        "top_products": [{"product_name": name, "quantity_sold": qty} for name, qty in ranked],
    }


def get_low_stock_products(db: Session, *, business_id: uuid.UUID) -> dict:
    products = (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.reorder_level.isnot(None))
        .all()
    )
    results = []
    for product in products:
        variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
        total_stock = sum(v.stock_quantity for v in variants)
        if product.reorder_level is not None and total_stock <= product.reorder_level:
            results.append(
                {
                    "product_name": product.name,
                    "current_stock": total_stock,
                    "reorder_level": product.reorder_level,
                }
            )
    return {"low_stock_products": results}


def get_customer_udhaar(db: Session, *, business_id: uuid.UUID) -> dict:
    customers = db.query(Customer).filter(Customer.business_id == business_id).all()
    with_balance = []
    total = Decimal("0.00")
    for customer in customers:
        balance = customer_payment_service.get_balance(db, business_id=business_id, customer_id=customer.id)
        if balance.balance > 0:
            with_balance.append({"customer_name": customer.name, "balance_due": _d(balance.balance)})
            total += balance.balance
    return {"total_customer_udhaar": _d(total), "customers_with_due": with_balance}


def get_supplier_payables(db: Session, *, business_id: uuid.UUID) -> dict:
    suppliers = db.query(Supplier).filter(Supplier.business_id == business_id).all()
    with_balance = []
    total = Decimal("0.00")
    for supplier in suppliers:
        balance = supplier_payment_service.get_balance(db, business_id=business_id, supplier_id=supplier.id)
        if balance.balance > 0:
            with_balance.append({"supplier_name": supplier.name, "balance_due": _d(balance.balance)})
            total += balance.balance
    return {"total_supplier_payables": _d(total), "suppliers_with_due": with_balance}


def get_expenses(
    db: Session, *, business_id: uuid.UUID, date_from: str | None = None, date_to: str | None = None
) -> dict:
    from app.models.expense import Expense

    query = db.query(Expense).filter(Expense.business_id == business_id)
    if date_from:
        query = query.filter(Expense.expense_date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Expense.expense_date <= date.fromisoformat(date_to))
    expenses = query.order_by(Expense.amount.desc()).all()
    total = sum((e.amount for e in expenses), Decimal("0.00"))
    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_expenses": _d(total),
        "top_expenses": [
            {"description": e.description, "amount": _d(e.amount), "date": _d(e.expense_date)}
            for e in expenses[:5]
        ],
    }


def get_profit_summary(
    db: Session, *, business_id: uuid.UUID, date_from: str | None = None, date_to: str | None = None
) -> dict:
    parsed_from = date.fromisoformat(date_from) if date_from else None
    parsed_to = date.fromisoformat(date_to) if date_to else None
    summary = report_service.get_financial_summary(
        db, business_id=business_id, date_from=parsed_from, date_to=parsed_to
    )
    return {
        "date_from": date_from,
        "date_to": date_to,
        "revenue": _d(summary.revenue),
        "cogs": _d(summary.cogs),
        "gross_profit": _d(summary.gross_profit),
        "expenses": _d(summary.expenses),
        "net_profit": _d(summary.net_profit),
    }


def get_recent_sales(db: Session, *, business_id: uuid.UUID, limit: int = 5) -> dict:
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == business_id)
        .order_by(Sale.sale_date.desc(), Sale.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "recent_sales": [
            {
                "date": _d(s.sale_date),
                "invoice_number": s.invoice_number,
                "total": _d(s.total),
                "payment_status": s.payment_status,
            }
            for s in sales
        ]
    }


def get_recent_purchases(db: Session, *, business_id: uuid.UUID, limit: int = 5) -> dict:
    purchases = (
        db.query(Purchase)
        .filter(Purchase.business_id == business_id)
        .order_by(Purchase.purchase_date.desc(), Purchase.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "recent_purchases": [
            {
                "date": _d(p.purchase_date),
                "invoice_number": p.invoice_number,
                "total": _d(p.total_amount),
                "payment_status": p.payment_status,
            }
            for p in purchases
        ]
    }


def get_product_information(db: Session, *, business_id: uuid.UUID, product_name: str) -> dict:
    products = (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.name.ilike(f"%{product_name}%"))
        .all()
    )
    if not products:
        return {"found": False, "message": f'No product matching "{product_name}" was found.'}
    results = []
    for product in products:
        variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
        results.append(
            {
                "name": product.name,
                "category": product.category,
                "brand": product.brand,
                "selling_price": _d(product.selling_price),
                "purchase_price": _d(product.purchase_price),
                "total_stock": sum(v.stock_quantity for v in variants),
                "reorder_level": product.reorder_level,
            }
        )
    return {"found": True, "products": results}


# Name -> function, used by assistant_service.dispatch_tool(). This is
# the single source of truth for "which tools exist" — the Gemini
# function declarations in llm_provider.py must stay in sync with this.
TOOL_REGISTRY = {
    "get_sales_summary": get_sales_summary,
    "get_purchase_summary": get_purchase_summary,
    "get_top_products": get_top_products,
    "get_low_stock_products": get_low_stock_products,
    "get_customer_udhaar": get_customer_udhaar,
    "get_supplier_payables": get_supplier_payables,
    "get_expenses": get_expenses,
    "get_profit_summary": get_profit_summary,
    "get_recent_sales": get_recent_sales,
    "get_recent_purchases": get_recent_purchases,
    "get_product_information": get_product_information,
}