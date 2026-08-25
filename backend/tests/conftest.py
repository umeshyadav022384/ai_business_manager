"""
Test fixtures.

Runs against a real PostgreSQL database (ai_business_manager_test), not
SQLite — the models use Postgres-specific types (UUID, ENUM), so a
lighter in-memory DB would not exercise the same code paths as
production.

DATABASE_URL is overridden to point at the test database BEFORE any
app module is imported, so app.core.config.Settings picks up the test
URL instead of the developer's real .env.
"""

import os

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://abm_user:abm_password@localhost:5432/ai_business_manager_test",
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import app.models  # noqa: E402,F401 — registers all models on Base.metadata
from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(os.environ["DATABASE_URL"])
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    """Creates all tables once for the test session, drops them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    """Empties every table after each test so tests don't leak state
    into one another (e.g. the unique email constraint)."""
    yield
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture
def client():
    return TestClient(app)