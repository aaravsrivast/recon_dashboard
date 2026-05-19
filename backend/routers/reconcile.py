from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend.engine.reconcile import run_reconciliation
from backend.models.schemas import (
    Discrepancy,
    DiscrepancyType,
    FullReconciliationResponse,
    ReconcileRequest,
    ReconciliationSummary,
    Severity,
)

router = APIRouter()

_cache: dict[str, Any] = {
    "result": None,
    "platform_path": None,
    "bank_path": None,
}


def _default_paths() -> tuple[str, str]:
    root = Path(__file__).resolve().parents[2]
    data_dir = root / "data"
    return str(data_dir / "platform_transactions.csv"), str(data_dir / "bank_settlements.csv")


def get_cached_result() -> FullReconciliationResponse | None:
    result = _cache.get("result")
    if isinstance(result, FullReconciliationResponse):
        return result
    return None


@router.post("/reconcile", response_model=FullReconciliationResponse)
def reconcile(body: ReconcileRequest | None = None) -> FullReconciliationResponse:
    platform_path, bank_path = _default_paths()
    if body and body.platform_path and body.bank_path:
        platform_path = body.platform_path
        bank_path = body.bank_path

    try:
        result = run_reconciliation(platform_path, bank_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    _cache["result"] = result
    _cache["platform_path"] = platform_path
    _cache["bank_path"] = bank_path
    return result


@router.get("/summary", response_model=ReconciliationSummary)
def summary() -> ReconciliationSummary:
    result = get_cached_result()
    if result is None:
        raise HTTPException(status_code=404, detail="No reconciliation run has been performed.")
    return result.summary


@router.get("/discrepancies", response_model=list[Discrepancy])
def discrepancies(
    type: DiscrepancyType | None = Query(default=None),
    severity: Severity | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[Discrepancy]:
    result = get_cached_result()
    if result is None:
        raise HTTPException(status_code=404, detail="No reconciliation run has been performed.")

    items = result.discrepancies
    if type is not None:
        items = [item for item in items if item.discrepancy_type == type]
    if severity is not None:
        items = [item for item in items if item.severity == severity]

    return items[offset : offset + limit]
