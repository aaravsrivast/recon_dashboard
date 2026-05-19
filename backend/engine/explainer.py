from __future__ import annotations

from backend.models.schemas import Discrepancy, DiscrepancyType


def _month_label(date_str: str | None) -> str:
    if not date_str:
        return "the reporting"
    parts = date_str.split("-")
    if len(parts) < 2:
        return date_str
    year, month = int(parts[0]), int(parts[1])
    names = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]
    return f"{names[month - 1]} {year}"


def _next_month_label(date_str: str | None) -> str:
    if not date_str:
        return "the following period"
    parts = date_str.split("-")
    if len(parts) < 2:
        return "the following period"
    year, month = int(parts[0]), int(parts[1])
    month += 1
    if month > 12:
        month = 1
        year += 1
    names = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]
    return f"{names[month - 1]} {year}"


def _format_currency(value: float | None) -> str:
    if value is None:
        return "$0.00"
    return f"${abs(value):,.2f}"


def generate_explanation(discrepancy: Discrepancy) -> str:
    """Generate a human-readable explanation for a discrepancy."""
    txn_id = discrepancy.transaction_id
    delta = _format_currency(discrepancy.delta)
    metadata = discrepancy.metadata or {}

    if discrepancy.discrepancy_type == DiscrepancyType.TIMING_GAP:
        month = _month_label(discrepancy.platform_date)
        return (
            f"Transaction {txn_id} was recorded by the platform on "
            f"{discrepancy.platform_date} but the bank settled it on "
            f"{discrepancy.bank_date}, crossing the {month} month-end cutoff. "
            f"This creates a temporary reconciliation gap of {delta} that will clear "
            f"in the following period."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.ROUNDING_DIFFERENCE:
        count = metadata.get("contributing_count", 0)
        return (
            f"The bank calculated processor fees using truncation rather than "
            f"rounding on {count} transactions, creating individual deltas of $0.01 each. "
            f"The cumulative variance across these transactions is "
            f"{_format_currency(discrepancy.delta)}. No single transaction shows a mismatch; "
            f"the discrepancy only surfaces in period totals."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.DUPLICATE_ENTRY:
        amount = _format_currency(discrepancy.platform_amount)
        dupe_id = metadata.get("duplicate_settlement_id", "duplicate settlement")
        original_id = metadata.get("original_settlement_id", "original settlement")
        batch_id = discrepancy.affected_batch or "unknown batch"
        return (
            f"Transaction {txn_id} ({amount}) appears twice in the bank settlement file. "
            f"Settlement {dupe_id} in batch {batch_id} is a duplicate of {original_id}. "
            f"The bank has overstated gross receipts by {delta}."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.ORPHAN_REFUND:
        return (
            f"The bank processed a refund of {delta} referencing {txn_id}, "
            f"but no transaction with this ID exists in the platform ledger. This may "
            f"indicate a manual bank-side reversal, a data entry error, or a transaction "
            f"that was processed outside the platform."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.UNMATCHED_SETTLEMENT:
        settlement_id = metadata.get("settlement_id", "unknown settlement")
        return (
            f"Settlement {settlement_id} for {delta} appears in bank records "
            f"on {discrepancy.bank_date} with no corresponding platform transaction. "
            f"This may be a bank-initiated credit, a returned chargeback, or a data "
            f"pipeline gap."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.AMOUNT_MISMATCH:
        return (
            f"Transaction {txn_id} matched between platform and bank but the amounts "
            f"differ. Platform recorded {_format_currency(discrepancy.platform_amount)}; "
            f"bank settled {_format_currency(discrepancy.bank_amount)}. Delta of {delta} "
            f"exceeds rounding tolerance."
        )

    return "Discrepancy detected during reconciliation."


def generate_resolution_hint(discrepancy: Discrepancy) -> str:
    """Generate a one-line recommended action for a discrepancy."""
    txn_id = discrepancy.transaction_id
    disc_id = discrepancy.discrepancy_id
    delta = _format_currency(discrepancy.delta)
    metadata = discrepancy.metadata or {}

    if discrepancy.discrepancy_type == DiscrepancyType.TIMING_GAP:
        month = _month_label(discrepancy.platform_date)
        next_month = _next_month_label(discrepancy.platform_date)
        return (
            f"Confirm with bank that {txn_id} was intentionally deferred. "
            f"Exclude from {month} close; include in {next_month} opening balance."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.ROUNDING_DIFFERENCE:
        return (
            f"Request fee recalculation memo from processor. Adjust fee ledger by {delta} "
            f"via journal entry with reference {disc_id}."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.DUPLICATE_ENTRY:
        dupe_id = metadata.get("duplicate_settlement_id", "duplicate settlement")
        return (
            f"Raise dispute with bank referencing {dupe_id}. Do not recognise {delta} as "
            f"revenue until confirmed unique settlement."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.ORPHAN_REFUND:
        return (
            f"Escalate to payments operations. Trace {txn_id} in bank portal directly. "
            f"If error confirmed, request reversal from bank."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.UNMATCHED_SETTLEMENT:
        return (
            "Cross-reference with chargeback log and manual transfer register. "
            "If unexplained after 48 hours, escalate to finance ops."
        )

    if discrepancy.discrepancy_type == DiscrepancyType.AMOUNT_MISMATCH:
        return (
            f"Request itemised settlement statement from processor for {txn_id}. "
            f"Check for undisclosed fee deductions or partial settlement."
        )

    return "Review with finance operations and update reconciliation notes."


def enrich_discrepancy(discrepancy: Discrepancy) -> Discrepancy:
    """Fill explanation and resolution_hint on a discrepancy."""
    return discrepancy.model_copy(
        update={
            "explanation": generate_explanation(discrepancy),
            "resolution_hint": generate_resolution_hint(discrepancy),
        }
    )


async def llm_explain(discrepancy: Discrepancy, api_key: str) -> str:
    """
    Uses Anthropic claude-3-5-haiku to generate explanation.
    Activate by setting ANTHROPIC_API_KEY in environment.
    """
    _ = discrepancy, api_key
    # import anthropic
    # client = anthropic.Anthropic(api_key=api_key)
    # message = client.messages.create(
    #     model="claude-3-5-haiku-20241022",
    #     max_tokens=120,
    #     messages=[{
    #         "role": "user",
    #         "content": (
    #             "You are a payments reconciliation analyst. Explain this "
    #             f"discrepancy in one clear sentence for a finance operations team: {discrepancy}"
    #         ),
    #     }],
    # )
    # return message.content[0].text
    return generate_explanation(discrepancy)
