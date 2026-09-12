import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_business
from app.models.business import Business
from app.schemas.expense import (
    ExpenseCategoryCreate,
    ExpenseCategoryResponse,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
)
from app.services import expense_service
from app.services.expense_service import ExpenseCategoryNotFoundError, ExpenseNotFoundError

router = APIRouter(prefix="/api/v1/expenses", tags=["expenses"])
categories_router = APIRouter(prefix="/api/v1/expense-categories", tags=["expenses"])


@categories_router.post("", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: ExpenseCategoryCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return expense_service.create_category(db, business_id=business.id, payload=payload)


@categories_router.get("", response_model=list[ExpenseCategoryResponse])
def list_categories(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return expense_service.list_categories(db, business_id=business.id)


@categories_router.put("/{category_id}", response_model=ExpenseCategoryResponse)
def update_category(
    category_id: uuid.UUID,
    payload: ExpenseCategoryUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return expense_service.update_category(
            db, business_id=business.id, category_id=category_id, payload=payload
        )
    except ExpenseCategoryNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


@categories_router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        expense_service.delete_category(db, business_id=business.id, category_id=category_id)
    except ExpenseCategoryNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return expense_service.create_expense(db, business_id=business.id, payload=payload)
    except ExpenseCategoryNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    return expense_service.list_expenses(db, business_id=business.id)


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return expense_service.get_expense(db, business_id=business.id, expense_id=expense_id)
    except ExpenseNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        return expense_service.update_expense(
            db, business_id=business.id, expense_id=expense_id, payload=payload
        )
    except ExpenseNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    except ExpenseCategoryNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: uuid.UUID,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    try:
        expense_service.delete_expense(db, business_id=business.id, expense_id=expense_id)
    except ExpenseNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")