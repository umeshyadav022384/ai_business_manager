"""
Health-check endpoint. Used to verify:
  1. The API process is up and responding.
  2. The API can reach the database (optional check via /health/db).
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/api/v1/health", tags=["health"])


@router.get("")
def health_check():
    """Basic liveness check — no DB dependency."""
    return {"status": "ok", "service": "ai-business-manager-backend"}


@router.get("/db")
def health_check_db(db: Session = Depends(get_db)):
    """Verifies the backend can actually reach PostgreSQL."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
