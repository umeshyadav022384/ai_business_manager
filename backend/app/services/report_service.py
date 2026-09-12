"""
Financial report calculations. Revenue/COGS/expenses ARE date-
filtered; customer_udhaar/supplier_payables are current running
balances, NOT date-filtered (mixing these would be misleading).

Cancelled sales/purchases never appear here since they're hard-deleted
— nothing to filter out. Customer/supplier payments never count as
revenue/expenses — they settle existing receivables/payables.
"""

import uuid
from datetime import date as date_type
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.customer_payment import CustomerPayment
from app.models.expense import Expense
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.supplier_payment import SupplierPayment
from app.schemas.report import FinancialSummaryResponse


def get_financial_summary(
    db: Session,
    *,
    business_id: uuid.UUID,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
) -> FinancialSummaryResponse:
    sales_query = db.query(Sale).filter(Sale.business_id == business_id)
    if date_from is not None:
        sales_query = sales_query.filter(Sale.sale_date >= date_from)
    if date_to is not None:
        sales_query = sales_query.filter(Sale.sale_date <= date_to)
    sales = sales_query.all()

    revenue = sum((sale.total for sale in sales), Decimal("0.00"))

    sale_ids = [sale.id for sale in sales]
    cogs = Decimal("0.00")
    if sale_ids:
        items = db.query(SaleItem).filter(SaleItem.sale_id.in_(sale_ids)).all()
        cogs = sum((item.unit_cost * item.quantity for item in items), Decimal("0.00"))

    gross_profit = revenue - cogs

    expenses_query = db.query(Expense).filter(Expense.business_id == business_id)
    if date_from is not None:
        expenses_query = expenses_query.filter(Expense.expense_date >= date_from)
    if date_to is not None:
        expenses_query = expenses_query.filter(Expense.expense_date <= date_to)
    total_expenses = sum(
        (row[0] for row in expenses_query.with_entities(Expense.amount).all()),
        Decimal("0.00"),
    )

    net_profit = gross_profit - total_expenses

    total_sale_due = sum(
        (
            row[0]
            for row in db.query(Sale)
            .filter(Sale.business_id == business_id)
            .with_entities(Sale.balance_due)
            .all()
        ),
        Decimal("0.00"),
    )
    total_customer_paid = sum(
        (
            row[0]
            for row in db.query(CustomerPayment)
            .filter(CustomerPayment.business_id == business_id)
            .with_entities(CustomerPayment.amount)
            .all()
        ),
        Decimal("0.00"),
    )
    customer_udhaar = total_sale_due - total_customer_paid

    total_purchase_due = sum(
        (
            row[0]
            for row in db.query(Purchase)
            .filter(Purchase.business_id == business_id)
            .with_entities(Purchase.balance_due)
            .all()
        ),
        Decimal("0.00"),
    )
    total_supplier_paid = sum(
        (
            row[0]
            for row in db.query(SupplierPayment)
            .filter(SupplierPayment.business_id == business_id)
            .with_entities(SupplierPayment.amount)
            .all()
        ),
        Decimal("0.00"),
    )
    supplier_payables = total_purchase_due - total_supplier_paid

    return FinancialSummaryResponse(
        date_from=date_from,
        date_to=date_to,
        revenue=revenue.quantize(Decimal("0.01")),
        cogs=cogs.quantize(Decimal("0.01")),
        gross_profit=gross_profit.quantize(Decimal("0.01")),
        expenses=total_expenses.quantize(Decimal("0.01")),
        net_profit=net_profit.quantize(Decimal("0.01")),
        customer_udhaar=customer_udhaar.quantize(Decimal("0.01")),
        supplier_payables=supplier_payables.quantize(Decimal("0.01")),
    )