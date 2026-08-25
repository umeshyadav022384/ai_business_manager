# AI Business Manager

A multi-tenant SaaS platform for small retail businesses (grocery/kirana
and clothing shops) in Nepal and India.

## Status: Phase 1 — Foundation

This phase only proves the skeleton works: frontend, backend, and
database can all talk to each other. No authentication, business logic,
or AI features exist yet.

## Architecture (Phase 1)

```
ai-business-manager/
  frontend/     React + TypeScript + Vite (runs on host, port 5173)
  backend/      FastAPI + SQLAlchemy + Alembic (runs on host, port 8000)
  database/     (reserved for future init scripts)
  docker-compose.yml   Postgres only, for now
```

Frontend and backend run directly on the host in Phase 1 for fast
iteration. Only PostgreSQL is containerized. Full containerization of
the whole app is planned for a later phase.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker (for PostgreSQL) — or a locally installed PostgreSQL 16

## 1. Start PostgreSQL

```bash
cp .env.example .env
docker compose up -d
```

This starts a Postgres 16 container on `localhost:5432` with the
credentials from `.env`.

## 2. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`.

## 3. Frontend setup

In a separate terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`.

## 4. Verify everything works

1. Open `http://localhost:8000/` — should return
   `{"message": "AI Business Manager API is running"}`
2. Open `http://localhost:8000/api/v1/health` — should return
   `{"status": "ok", "service": "ai-business-manager-backend"}`
3. Open `http://localhost:8000/api/v1/health/db` — should return
   `{"status": "ok", "database": "connected"}` (requires Postgres running)
4. Open `http://localhost:5173/` in a browser — should show
   "✅ Backend responded: status = "ok", service = "...""

If step 4 shows a red ❌ instead, the backend isn't running or isn't
reachable at the URL configured in `frontend/.env`.

## What's next

Phase 2 will add: User/BusinessMember/Business models, Alembic
migrations for them, JWT-based authentication, and business creation.
