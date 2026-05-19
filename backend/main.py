from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.engine.reconcile import run_reconciliation
from backend.routers import health, reconcile, upload

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", os.getenv("NEXT_PUBLIC_FRONTEND_URL", "*"))
IS_PRODUCTION = os.getenv("VERCEL_ENV") == "production" or os.getenv("ENV") == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    platform_path, bank_path = _default_data_paths()
    if platform_path.exists() and bank_path.exists():
        try:
            result = run_reconciliation(str(platform_path), str(bank_path))
            reconcile._cache["result"] = result
            reconcile._cache["platform_path"] = str(platform_path)
            reconcile._cache["bank_path"] = str(bank_path)
        except Exception:
            pass
    yield


def _default_data_paths() -> tuple[Path, Path]:
    root = Path(__file__).resolve().parents[1]
    data_dir = root / "data"
    return data_dir / "platform_transactions.csv", data_dir / "bank_settlements.csv"


app = FastAPI(
    title="ReconFlow API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

origins = [ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"]
if not IS_PRODUCTION:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(reconcile.router, prefix="/api", tags=["reconcile"])
app.include_router(upload.router, prefix="/api", tags=["upload"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    _ = request
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc)},
    )


@app.exception_handler(FileNotFoundError)
async def not_found_handler(request: Request, exc: FileNotFoundError):
    _ = request
    return JSONResponse(
        status_code=422,
        content={"error": "Unprocessable Entity", "detail": str(exc)},
    )
