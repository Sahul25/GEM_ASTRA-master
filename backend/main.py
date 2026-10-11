"""
backend/main.py
FastAPI entry point for GeM Astra.

This module deliberately does NOT import anything from utils/ at startup
so it cannot break the existing Streamlit app or test suite.
Business logic endpoints are added incrementally in later migration steps.

Start:
    uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tenders as tenders_router
from routers import summary as summary_router
from routers import network as network_router
from routers import auth as auth_router
from routers import gov as gov_router
import utils.database as db

app = FastAPI(
    title="GeM Astra API",
    description="AI-Driven Public Procurement Analytics — backend REST API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Initialise database schema (idempotent — safe to run on every startup)
db.init_db()

# Allow the Vite dev server (port 5173) and any localhost origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
#  Health                                                                      #
# --------------------------------------------------------------------------- #

@app.get("/api/health", tags=["system"])
def health():
    """Liveness probe — returns 200 when the API is reachable."""
    return {"status": "ok", "service": "gem-astra-api", "version": "0.1.0"}


# --------------------------------------------------------------------------- #
#  Routers                                                                     #
# --------------------------------------------------------------------------- #

app.include_router(tenders_router.router)
app.include_router(summary_router.router)
app.include_router(network_router.router)
app.include_router(auth_router.router)
app.include_router(gov_router.router)
