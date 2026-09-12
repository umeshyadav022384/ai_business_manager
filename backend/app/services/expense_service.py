"""
Expense and ExpenseCategory business logic. Same isolation pattern as
every prior service.
"""

import uuid

from sqlalchemy.orm import Session, selectinload

from app.models.expense import Expense, ExpenseCategory
from app.schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseUpdate,
)


class ExpenseCategoryNotFoundError(Exception):
    pass


class ExpenseNotFoundError(Exception):
    pass


def create_category(
    db: Session, *, business_id: uuid.UUID, payload: ExpenseCategoryCreate
) -> ExpenseCategory:
    category = ExpenseCategory(business_id=business_id, **payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def list_categories(db: Session, *, business_id: uuid.UUID) -> list[ExpenseCategory]:
    return (
        db.query(ExpenseCategory)
        .filter(ExpenseCategory.business_id == business_id)
        .order_by(ExpenseCategory.name)
        .all()
    )


def get_category(
    db: Session, *, business_id: uuid.UUID, category_id: uuid.UUID
) -> ExpenseCategory:
    category = (
        db.query(ExpenseCategory)
        .filter(ExpenseCategory.id == category_id, ExpenseCategory.business_id == business_id)
        .first()
    )
    if category is None:
        raise ExpenseCategoryNotFoundError("Expense category not found")
    return category


def update_category(
    db: Session,
    *,
    business_id: uuid.UUID,
    category_id: uuid.UUID,
    payload: ExpenseCategoryUpdate,
) -> ExpenseCategory:
    category = get_category(db, business_id=business_id, category_id=category_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


def delete_category(
    db: Session, *, business_id: uuid.UUID, category_id: uuid.UUID
) -> None:
    category = get_category(db, business_id=business_id, category_id=category_id)
    db.delete(category)
    db.commit()


def _validate_category(
    db: Session, *, business_id: uuid.UUID, category_id: uuid.UUID | None
) -> None:
    if category_id is None:
        return
    exists = (
        db.query(ExpenseCategory.id)
        .filter(ExpenseCategory.id == category_id, ExpenseCategory.business_id == business_id)
        .first()
    )
    if exists is None:
        raise ExpenseCategoryNotFoundError("Expense category not found")


def _expense_query(db: Session, business_id: uuid.UUID):
    return (
        db.query(Expense)
        .options(selectinload(Expense.category))
        .filter(Expense.business_id == business_id)
    )


def create_expense(
    db: Session, *, business_id: uuid.UUID, payload: ExpenseCreate
) -> Expense:
    _validate_category(db, business_id=business_id, category_id=payload.category_id)
    expense = Expense(business_id=business_id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def list_expenses(db: Session, *, business_id: uuid.UUID) -> list[Expense]:
    return _expense_query(db, business_id).order_by(Expense.expense_date.desc()).all()


def get_expense(db: Session, *, business_id: uuid.UUID, expense_id: uuid.UUID) -> Expense:
    expense = _expense_query(db, business_id).filter(Expense.id == expense_id).first()
    if expense is None:
        raise ExpenseNotFoundError("Expense not found")
    return expense


def update_expense(
    db: Session,
    *,
    business_id: uuid.UUID,
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
) -> Expense:
    expense = get_expense(db, business_id=business_id, expense_id=expense_id)
    update_data = payload.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        _validate_category(db, business_id=business_id, category_id=update_data["category_id"])
    for field, value in update_data.items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, *, business_id: uuid.UUID, expense_id: uuid.UUID) -> None:
    expense = get_expense(db, business_id=business_id, expense_id=expense_id)
    db.delete(expense)
    db.commit()