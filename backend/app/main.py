"""
FastAPI application entry point.

Phase 5 adds Customers and Sales (with stock validation and the
decrease-inventory transaction), scoped to the caller's business via
get_current_business. Udhaar/credit, expenses, reports, and AI are
still out of scope.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    business,
    customer,
    expense,
    health,
    product,
    purchase,
    report,
    sale,
    supplier,
)
app = FastAPI(
    title="AI Business Manager API",
    version="0.5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(business.router)
app.include_router(product.router)
app.include_router(supplier.router)
app.include_router(purchase.router)
app.include_router(customer.router)
app.include_router(sale.router)
app.include_router(expense.router)
app.include_router(expense.categories_router)
app.include_router(report.router)


@app.get("/")
def root():
    return {"message": "AI Business Manager API is running"}