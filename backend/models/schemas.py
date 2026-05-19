from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DiscrepancyType(str, Enum):
    TIMING_GAP = "TIMING_GAP"
    ROUNDING_DIFFERENCE = "ROUNDING_DIFFERENCE"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    ORPHAN_REFUND = "ORPHAN_REFUND"
    UNMATCHED_SETTLEMENT = "UNMATCHED_SETTLEMENT"
    AMOUNT_MISMATCH = "AMOUNT_MISMATCH"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Discrepancy(BaseModel):
    discrepancy_id: str
    transaction_id: str
    discrepancy_type: DiscrepancyType
    severity: Severity
    platform_amount: float | None
    bank_amount: float | None
    delta: float
    platform_date: str | None
    bank_date: str | None
    explanation: str
    affected_batch: str | None
    resolution_hint: str
    metadata: dict[str, Any] | None = Field(default=None)


class ReconciliationSummary(BaseModel):
    period: str
    platform_transaction_count: int
    bank_settlement_count: int
    matched_count: int
    unmatched_platform_count: int
    unmatched_bank_count: int
    platform_gross_total: float
    bank_gross_total: float
    net_variance: float
    discrepancy_count: int
    discrepancy_breakdown: dict[str, int]
    severity_breakdown: dict[str, int]
    reconciliation_rate: float


class FullReconciliationResponse(BaseModel):
    summary: ReconciliationSummary
    discrepancies: list[Discrepancy]
    reconciled_transactions: list[dict[str, Any]]
    run_timestamp: str


class ReconcileRequest(BaseModel):
    platform_path: str | None = None
    bank_path: str | None = None


class ErrorResponse(BaseModel):
    error: str
    detail: str
