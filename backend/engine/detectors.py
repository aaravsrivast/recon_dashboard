from __future__ import annotations

import math
from datetime import datetime

import pandas as pd

from backend.engine.classifier import classify
from backend.models.schemas import Discrepancy, DiscrepancyType, Severity

FEE_TOLERANCE = 0.011
AMOUNT_TOLERANCE = 0.005


def _format_date(ts: pd.Timestamp | datetime | None) -> str | None:
    if ts is None or (isinstance(ts, float) and math.isnan(ts)):
        return None
    if isinstance(ts, pd.Timestamp):
        return ts.strftime("%Y-%m-%d")
    return pd.Timestamp(ts).strftime("%Y-%m-%d")


def detect_timing_gaps(
    platform_df: pd.DataFrame,
    bank_df: pd.DataFrame,
    matched_df: pd.DataFrame,
) -> list[Discrepancy]:
    """Detect month-end timing gaps and cross-month settlement delays."""
    discrepancies: list[Discrepancy] = []
    bank_by_txn = bank_df.groupby("transaction_id")

    for txn_id, group in bank_by_txn:
        if txn_id not in set(platform_df["transaction_id"]):
            continue
        platform_row = platform_df[platform_df["transaction_id"] == txn_id].iloc[0]
        for _, bank_row in group.iterrows():
            platform_month = platform_row["transaction_date"].strftime("%Y-%m")
            bank_month = bank_row["settlement_date"].strftime("%Y-%m")
            if platform_month == bank_month:
                continue
            delta = float(bank_row["gross_amount"]) - float(platform_row["gross_amount"])
            lag_days = (
                bank_row["settlement_date"] - platform_row["transaction_date"]
            ).days
            severity = Severity.MEDIUM
            if lag_days > 1:
                severity = Severity.HIGH
            if platform_month != bank_month:
                severity = Severity.CRITICAL if lag_days > 1 else Severity.HIGH

            discrepancies.append(
                Discrepancy(
                    discrepancy_id="",
                    transaction_id=str(txn_id),
                    discrepancy_type=DiscrepancyType.TIMING_GAP,
                    severity=severity,
                    platform_amount=float(platform_row["gross_amount"]),
                    bank_amount=float(bank_row["gross_amount"]),
                    delta=delta,
                    platform_date=_format_date(platform_row["transaction_date"]),
                    bank_date=_format_date(bank_row["settlement_date"]),
                    explanation="",
                    affected_batch=str(bank_row["batch_id"]),
                    resolution_hint="",
                )
            )

    bank_payment_ids = set(
        bank_df[bank_df["type"].str.lower() == "payment"]["transaction_id"]
    )
    candidates: list[pd.Series] = []
    for _, row in platform_df.iterrows():
        txn_id = row["transaction_id"]
        if txn_id in bank_payment_ids:
            continue
        txn_month = row["transaction_date"].strftime("%Y-%m")
        expected_month = row["expected_settlement_date"].strftime("%Y-%m")
        if expected_month == txn_month:
            continue
        if not row["transaction_date"].is_month_end:
            continue
        candidates.append(row)

    if candidates:
        candidate_df = pd.DataFrame(candidates)
        primary = candidate_df.loc[candidate_df["gross_amount"].idxmax()]
        expected_date = primary["expected_settlement_date"]
        discrepancies.append(
            Discrepancy(
                discrepancy_id="",
                transaction_id=str(primary["transaction_id"]),
                discrepancy_type=DiscrepancyType.TIMING_GAP,
                severity=Severity.HIGH,
                platform_amount=float(primary["gross_amount"]),
                bank_amount=None,
                delta=-float(primary["gross_amount"]),
                platform_date=_format_date(primary["transaction_date"]),
                bank_date=_format_date(expected_date),
                explanation="",
                affected_batch=None,
                resolution_hint="",
            )
        )

    return discrepancies


def detect_rounding_differences(
    platform_df: pd.DataFrame,
    bank_df: pd.DataFrame,
) -> list[Discrepancy]:
    """Aggregate processor fee rounding/truncation deltas into one discrepancy."""
    payments = bank_df[bank_df["type"].str.lower() == "payment"].copy()
    payments = payments.sort_values(["transaction_id", "settlement_date", "settlement_id"])
    bank_primary = payments.drop_duplicates(subset=["transaction_id"], keep="first")

    merged = platform_df.merge(bank_primary, on="transaction_id", suffixes=("_p", "_b"))
    contributing: list[str] = []
    total_delta = 0.0

    for _, row in merged.iterrows():
        fee_delta = float(row["processor_fee_b"]) - float(row["processor_fee_p"])
        gross = float(row["gross_amount_p"])
        rounded_fee = round(gross * 0.029, 2)
        truncated_fee = math.floor(gross * 0.029 * 100) / 100

        is_rounding = (
            0 < abs(fee_delta) <= FEE_TOLERANCE
            or (
                abs(float(row["processor_fee_p"]) - rounded_fee) < 0.001
                and abs(float(row["processor_fee_b"]) - truncated_fee) < 0.001
                and abs(truncated_fee - rounded_fee) >= 0.009
            )
        )
        if is_rounding:
            contributing.append(str(row["transaction_id"]))
            total_delta += fee_delta

    if not contributing or abs(total_delta) < 0.009:
        return []

    abs_delta = abs(total_delta)
    if abs_delta < 1:
        severity = Severity.LOW
    elif abs_delta <= 50:
        severity = Severity.MEDIUM
    else:
        severity = Severity.HIGH

    return [
        Discrepancy(
            discrepancy_id="",
            transaction_id="AGGREGATE",
            discrepancy_type=DiscrepancyType.ROUNDING_DIFFERENCE,
            severity=severity,
            platform_amount=None,
            bank_amount=None,
            delta=round(total_delta, 2),
            platform_date=None,
            bank_date=None,
            explanation="",
            affected_batch=None,
            resolution_hint="",
            metadata={
                "contributing_transactions": contributing,
                "contributing_count": len(contributing),
            },
        )
    ]


def detect_duplicates(bank_df: pd.DataFrame) -> list[Discrepancy]:
    """Detect duplicate payment settlements for the same transaction_id."""
    discrepancies: list[Discrepancy] = []
    payments = bank_df[bank_df["type"].str.lower() == "payment"].copy()
    payments = payments.sort_values(["transaction_id", "settlement_date", "settlement_id"])

    for txn_id, group in payments.groupby("transaction_id"):
        if len(group) <= 1:
            continue
        original = group.iloc[0]
        for _, dupe in group.iloc[1:].iterrows():
            discrepancies.append(
                Discrepancy(
                    discrepancy_id="",
                    transaction_id=str(txn_id),
                    discrepancy_type=DiscrepancyType.DUPLICATE_ENTRY,
                    severity=Severity.HIGH,
                    platform_amount=float(original["gross_amount"]),
                    bank_amount=float(dupe["gross_amount"]),
                    delta=float(dupe["gross_amount"]),
                    platform_date=_format_date(original["settlement_date"]),
                    bank_date=_format_date(dupe["settlement_date"]),
                    explanation="",
                    affected_batch=str(dupe["batch_id"]),
                    resolution_hint="",
                    metadata={
                        "original_settlement_id": str(original["settlement_id"]),
                        "duplicate_settlement_id": str(dupe["settlement_id"]),
                    },
                )
            )
    return discrepancies


def detect_orphan_refunds(
    platform_df: pd.DataFrame,
    bank_df: pd.DataFrame,
) -> list[Discrepancy]:
    """Detect bank refunds with no platform transaction."""
    platform_ids = set(platform_df["transaction_id"])
    discrepancies: list[Discrepancy] = []

    for _, row in bank_df[bank_df["type"].str.lower() == "refund"].iterrows():
        txn_id = row["transaction_id"]
        if txn_id in platform_ids:
            continue
        discrepancies.append(
            Discrepancy(
                discrepancy_id="",
                transaction_id=str(txn_id),
                discrepancy_type=DiscrepancyType.ORPHAN_REFUND,
                severity=Severity.CRITICAL,
                platform_amount=None,
                bank_amount=float(row["gross_amount"]),
                delta=float(row["gross_amount"]),
                platform_date=None,
                bank_date=_format_date(row["settlement_date"]),
                explanation="",
                affected_batch=str(row["batch_id"]),
                resolution_hint="",
            )
        )
    return discrepancies


def detect_unmatched_settlements(
    unmatched_bank: pd.DataFrame,
    orphan_txn_ids: set[str],
) -> list[Discrepancy]:
    """Flag bank rows without platform records that are not orphan refunds."""
    discrepancies: list[Discrepancy] = []
    for _, row in unmatched_bank.iterrows():
        txn_id = str(row["transaction_id"])
        if txn_id in orphan_txn_ids:
            continue
        if row["type"].str.lower() == "refund":
            continue
        discrepancies.append(
            Discrepancy(
                discrepancy_id="",
                transaction_id=txn_id,
                discrepancy_type=DiscrepancyType.UNMATCHED_SETTLEMENT,
                severity=Severity.HIGH,
                platform_amount=None,
                bank_amount=float(row["gross_amount"]),
                delta=float(row["gross_amount"]),
                platform_date=None,
                bank_date=_format_date(row["settlement_date"]),
                explanation="",
                affected_batch=str(row["batch_id"]),
                resolution_hint="",
                metadata={"settlement_id": str(row["settlement_id"])},
            )
        )
    return discrepancies


def detect_amount_mismatches(
    platform_df: pd.DataFrame,
    bank_df: pd.DataFrame,
    rounding_txn_ids: set[str],
) -> list[Discrepancy]:
    """Detect gross amount mismatches beyond rounding tolerance."""
    payments = bank_df[bank_df["type"].str.lower() == "payment"].copy()
    payments = payments.sort_values(["transaction_id", "settlement_date", "settlement_id"])
    bank_primary = payments.drop_duplicates(subset=["transaction_id"], keep="first")
    merged = platform_df.merge(bank_primary, on="transaction_id", suffixes=("_p", "_b"))

    discrepancies: list[Discrepancy] = []
    for _, row in merged.iterrows():
        txn_id = str(row["transaction_id"])
        if txn_id in rounding_txn_ids:
            continue
        delta = float(row["gross_amount_b"]) - float(row["gross_amount_p"])
        if abs(delta) <= AMOUNT_TOLERANCE:
            continue
        discrepancies.append(
            Discrepancy(
                discrepancy_id="",
                transaction_id=txn_id,
                discrepancy_type=DiscrepancyType.AMOUNT_MISMATCH,
                severity=Severity.MEDIUM,
                platform_amount=float(row["gross_amount_p"]),
                bank_amount=float(row["gross_amount_b"]),
                delta=delta,
                platform_date=_format_date(row["transaction_date"]),
                bank_date=_format_date(row["settlement_date"]),
                explanation="",
                affected_batch=str(row["batch_id"]),
                resolution_hint="",
            )
        )
    return discrepancies


def apply_classification(discrepancies: list[Discrepancy]) -> list[Discrepancy]:
    """Recompute severity using classifier for each discrepancy."""
    updated: list[Discrepancy] = []
    for item in discrepancies:
        severity = classify(item)
        updated.append(item.model_copy(update={"severity": severity}))
    return updated
