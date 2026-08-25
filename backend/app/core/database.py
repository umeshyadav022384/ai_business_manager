"""
SQLAlchemy engine and session setup.

No models are defined yet (Phase 1 scope is just proving connectivity).
`Base` is declared here so future model files (app/models/*.py) can import
it and be picked up by Alembic once we introduce migrations for real
tables.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a DB session and ensures it's closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
