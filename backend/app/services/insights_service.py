"""
AI Business Insights — a modular, rule-based analysis engine.

InsightsProvider is the seam that makes the AI provider swappable
later: RuleBasedInsightsProvider is a deterministic analyzer over the
business's own data (no external API, no credentials, no risk of
sending one business's data to a third party). A real LLM-backed
provider would implement the same Protocol; get_business_insights()
is the only place that would need to change.

Every function below reuses report_service.get_financial_summary
rather than re-deriving revenue/COGS/expenses/udhaar/payables — this
guarantees the insights never disagree with what the Reports page
shows for the same business.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Protocol

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.schemas.insight import Insight
from app.services import report_service


class InsightsProvider(Protocol):
    def generate(self, db: Session, *, business_id: uuid.UUID) -> list["Insight"]: ...


def _low_stock_insights(db: Session, business_id: uuid.UUID) -> list[Insight]:
    products = (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.reorder_level.isnot(None))
        .all()
    )
    insights: list[Insight] = []
    for product in products:
        variants = (
            db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
        )
        total_stock = sum(v.stock_quantity for v in variants)
        if product.reorder_level is not None and total_stock <= product.reorder_level:
            severity = "critical" if total_stock <= 0 else "warning"
            insights.append(
                Insight(
                    type="low_stock",
                    severity=severity,
                    title=f'Low stock: "{product.name}"',
                    message=(
                        f'"{product.name}" has {total_stock} units left '
                        f"(reorder level: {product.reorder_level}). Consider restocking soon."
                        if total_stock > 0
                        else f'"{product.name}" is out of stock.'
                    ),
                )
            )
    return insights


def _best_slow_seller_insights(db: Session, business_id: uuid.UUID) -> list[Insight]:
    thirty_days_ago = date.today() - timedelta(days=30)
    recent_items = (
        db.query(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.business_id == business_id, Sale.sale_date >= thirty_days_ago)
        .all()
    )

    if not recent_items:
        return []

    quantity_by_product: dict[str, int] = {}
    for item in recent_items:
        quantity_by_product[item.product_name] = (
            quantity_by_product.get(item.product_name, 0) + item.quantity
        )

    insights: list[Insight] = []
    if quantity_by_product:
        best_name, best_qty = max(quantity_by_product.items(), key=lambda kv: kv[1])
        insights.append(
            Insight(
                type="best_seller",
                severity="info",
                title="Best-selling product",
                message=f'"{best_name}" sold {best_qty} units in the last 30 days — your top performer.',
            )
        )

    # Products that exist, have stock, but sold nothing in 30 days.
    sold_product_ids = {item.product_id for item in recent_items}
    all_products = db.query(Product).filter(Product.business_id == business_id).all()
    slow_candidates = []
    for product in all_products:
        if product.id in sold_product_ids:
            continue
        variants = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
        if sum(v.stock_quantity for v in variants) > 0:
            slow_candidates.append(product.name)

    if slow_candidates:
        shown = slow_candidates[:3]
        names = ", ".join(f'"{n}"' for n in shown)
        insights.append(
            Insight(
                type="slow_seller",
                severity="warning",
                title="Slow-moving stock",
                message=(
                    f"{names} had no sales in the last 30 days despite being in stock. "
                    "Consider a promotion or reviewing pricing."
                ),
            )
        )
    return insights


def _sales_trend_insight(db: Session, business_id: uuid.UUID) -> list[Insight]:
    today = date.today()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(days=1)

    this_week = report_service.get_financial_summary(
        db, business_id=business_id, date_from=this_week_start, date_to=today
    )
    last_week = report_service.get_financial_summary(
        db, business_id=business_id, date_from=last_week_start, date_to=last_week_end
    )

    if last_week.revenue == 0 and this_week.revenue == 0:
        return []

    if last_week.revenue == 0:
        return [
            Insight(
                type="sales_trend",
                severity="info",
                title="Sales this week",
                message=f"You've made {this_week.revenue} in sales so far this week.",
            )
        ]

    change_pct = ((this_week.revenue - last_week.revenue) / last_week.revenue) * Decimal(100)
    direction = "up" if change_pct > 0 else "down"
    return [
        Insight(
            type="sales_trend",
            severity="info" if change_pct >= 0 else "warning",
            title="Sales trend",
            message=(
                f"This week's sales are {direction} {abs(change_pct):.0f}% compared to last week "
                f"({this_week.revenue} vs {last_week.revenue})."
            ),
        )
    ]


def _expense_insight(db: Session, business_id: uuid.UUID) -> list[Insight]:
    today = date.today()
    this_month_start = today.replace(day=1)
    last_month_end = this_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    this_month = report_service.get_financial_summary(
        db, business_id=business_id, date_from=this_month_start, date_to=today
    )
    last_month = report_service.get_financial_summary(
        db, business_id=business_id, date_from=last_month_start, date_to=last_month_end
    )

    if last_month.expenses == 0:
        return []

    change_pct = ((this_month.expenses - last_month.expenses) / last_month.expenses) * Decimal(100)
    if change_pct > 20:
        return [
            Insight(
                type="expense_warning",
                severity="warning",
                title="Expenses rising",
                message=(
                    f"This month's expenses ({this_month.expenses}) are up {change_pct:.0f}% "
                    f"compared to last month ({last_month.expenses})."
                ),
            )
        ]
    return []


def _profit_insight(db: Session, business_id: uuid.UUID) -> list[Insight]:
    today = date.today()
    this_month_start = today.replace(day=1)
    summary = report_service.get_financial_summary(
        db, business_id=business_id, date_from=this_month_start, date_to=today
    )
    if summary.revenue == 0:
        return []
    return [
        Insight(
            type="profit_insight",
            severity="info" if summary.net_profit >= 0 else "critical",
            title="Profit this month",
            message=(
                f"Net profit so far this month is {summary.net_profit} "
                f"(gross profit {summary.gross_profit} minus expenses {summary.expenses})."
            ),
        )
    ]


def _udhaar_insight(db: Session, business_id: uuid.UUID) -> list[Insight]:
    summary = report_service.get_financial_summary(db, business_id=business_id)
    if summary.customer_udhaar <= 0:
        return []
    return [
        Insight(
            type="customer_udhaar",
            severity="warning",
            title="Outstanding customer Udhaar",
            message=f"Customers currently owe {summary.customer_udhaar} in total. Consider following up on overdue balances.",
        )
    ]


def _payable_insight(db: Session, business_id: uuid.UUID) -> list[Insight]:
    summary = report_service.get_financial_summary(db, business_id=business_id)
    if summary.supplier_payables <= 0:
        return []
    return [
        Insight(
            type="supplier_payable",
            severity="info",
            title="Outstanding supplier payables",
            message=f"Your business currently owes suppliers {summary.supplier_payables} in total.",
        )
    ]


class RuleBasedInsightsProvider:
    def generate(self, db: Session, *, business_id: uuid.UUID) -> list[Insight]:
        insights: list[Insight] = []
        insights.extend(_low_stock_insights(db, business_id))
        insights.extend(_best_slow_seller_insights(db, business_id))
        insights.extend(_sales_trend_insight(db, business_id))
        insights.extend(_expense_insight(db, business_id))
        insights.extend(_profit_insight(db, business_id))
        insights.extend(_udhaar_insight(db, business_id))
        insights.extend(_payable_insight(db, business_id))
        return insights


def get_business_insights(db: Session, *, business_id: uuid.UUID) -> list[Insight]:
    provider: InsightsProvider = RuleBasedInsightsProvider()
    return provider.generate(db, business_id=business_id)