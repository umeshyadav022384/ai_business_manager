"""
FastAPI application entry point.

Phase 3 adds Product/ProductVariant CRUD, scoped to the caller's
business via get_current_business. Purchases, sales, customers,
credit, expenses, reports, and AI are still out of scope.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, business, health, product

app = FastAPI(
    title="AI Business Manager API",
    version="0.3.0",
)

# Phase 1: allow the local Vite dev server to call the API.
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


@app.get("/")
def root():
    return {"message": "AI Business Manager API is running"}