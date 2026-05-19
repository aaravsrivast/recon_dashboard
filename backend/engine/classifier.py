from __future__ import annotations

from backend.models.schemas import Discrepancy, DiscrepancyType, Severity


def _amount_severity(delta: float) -> Severity:
    amount = abs(delta)
    if amount < 1:
        return Severity.LOW
    if amount < 100:
        return Severity.MEDIUM
    if amount < 1000:
        return Severity.HIGH
    return Severity.CRITICAL


def _base_type_severity(discrepancy_type: DiscrepancyType) -> Severity:
    mapping = {
        DiscrepancyType.TIMING_GAP: Severity.MEDIUM,
        DiscrepancyType.ROUNDING_DIFFERENCE: Severity.LOW,
        DiscrepancyType.DUPLICATE_ENTRY: Severity.HIGH,
        DiscrepancyType.ORPHAN_REFUND: Severity.CRITICAL,
        DiscrepancyType.UNMATCHED_SETTLEMENT: Severity.HIGH,
        DiscrepancyType.AMOUNT_MISMATCH: Severity.MEDIUM,
    }
    return mapping[discrepancy_type]


def _max_severity(a: Severity, b: Severity) -> Severity:
    order = [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL]
    return a if order.index(a) >= order.index(b) else b


def classify(discrepancy: Discrepancy) -> Severity:
    """Assign final severity from type baseline and dollar impact."""
    if discrepancy.discrepancy_type == DiscrepancyType.TIMING_GAP:
        return Severity.HIGH
    if discrepancy.discrepancy_type == DiscrepancyType.DUPLICATE_ENTRY:
        return Severity.HIGH
    if discrepancy.discrepancy_type == DiscrepancyType.ORPHAN_REFUND:
        return Severity.CRITICAL
    if discrepancy.discrepancy_type == DiscrepancyType.ROUNDING_DIFFERENCE:
        count = 0
        if discrepancy.metadata:
            count = int(discrepancy.metadata.get("contributing_count", 0))
        if count >= 10 or abs(discrepancy.delta) >= 1:
            return Severity.MEDIUM
        return Severity.LOW

    type_severity = _base_type_severity(discrepancy.discrepancy_type)
    amount_severity = _amount_severity(discrepancy.delta)
    final = _max_severity(type_severity, amount_severity)

    if discrepancy.discrepancy_type == DiscrepancyType.ORPHAN_REFUND:
        final = _max_severity(final, Severity.HIGH)
    if discrepancy.discrepancy_type == DiscrepancyType.DUPLICATE_ENTRY:
        final = _max_severity(final, Severity.HIGH)

    return final
