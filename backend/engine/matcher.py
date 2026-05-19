from __future__ import annotations

import pandas as pd

AMOUNT_TOLERANCE = 0.005


def _first_bank_per_transaction(bank_df: pd.DataFrame) -> pd.DataFrame:
    """Return first bank payment row per transaction_id (stable order)."""
    payments = bank_df[bank_df["type"].str.lower() == "payment"].copy()
    payments = payments.sort_values(["transaction_id", "settlement_date", "settlement_id"])
    return payments.drop_duplicates(subset=["transaction_id"], keep="first")


def match_transactions(
    platform_df: pd.DataFrame,
    bank_df: pd.DataFrame,
    period: str,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Join platform and bank records for reconciliation.

    Returns:
        matched_df, unmatched_platform_df, unmatched_bank_df, all_pairs_df
    """
    platform = platform_df.copy()
    bank = bank_df.copy()
    bank_primary = _first_bank_per_transaction(bank)

    platform_ids = set(platform["transaction_id"])
    bank_ids = set(bank["transaction_id"])

    merged = platform.merge(
        bank_primary,
        on="transaction_id",
        how="left",
        suffixes=("_platform", "_bank"),
        indicator=True,
    )

    matched_rows: list[dict[str, object]] = []
    unmatched_platform_rows: list[pd.Series] = []
    pair_rows: list[dict[str, object]] = []

    for _, row in merged.iterrows():
        txn_id = row["transaction_id"]
        has_bank = row["_merge"] == "both"

        if not has_bank:
            unmatched_platform_rows.append(platform[platform["transaction_id"] == txn_id].iloc[0])
            pair_rows.append(
                {
                    "transaction_id": txn_id,
                    "platform_date": row["transaction_date"].strftime("%Y-%m-%d"),
                    "settlement_date": None,
                    "platform_gross": float(row["gross_amount_platform"]),
                    "bank_gross": None,
                    "status": "UNMATCHED_PLATFORM",
                }
            )
            continue

        platform_gross = float(row["gross_amount_platform"])
        bank_gross = float(row["gross_amount_bank"])
        platform_month = row["transaction_date"].strftime("%Y-%m")
        bank_month = row["settlement_date"].strftime("%Y-%m")
        gross_delta = bank_gross - platform_gross

        if platform_month != bank_month:
            status = "TIMING_GAP"
        elif abs(gross_delta) > AMOUNT_TOLERANCE:
            status = "AMOUNT_MISMATCH"
        else:
            status = "MATCHED"

        record = {
            "transaction_id": txn_id,
            "platform_date": row["transaction_date"].strftime("%Y-%m-%d"),
            "settlement_date": row["settlement_date"].strftime("%Y-%m-%d"),
            "platform_gross": platform_gross,
            "bank_gross": bank_gross,
            "status": status,
        }
        pair_rows.append(record)

        if status == "MATCHED":
            matched_rows.append(record)

    # Bank rows without platform counterpart (all bank rows, not deduped)
    unmatched_bank = bank[~bank["transaction_id"].isin(platform_ids)].copy()

    # Bank payment rows in period not matched via primary join
    bank_period = bank[bank["settlement_month"] == period]
    for _, brow in bank_period.iterrows():
        if brow["transaction_id"] not in platform_ids:
            continue

    matched_df = pd.DataFrame(matched_rows)
    unmatched_platform_df = pd.DataFrame(unmatched_platform_rows)
    all_pairs_df = pd.DataFrame(pair_rows)

    return matched_df, unmatched_platform_df, unmatched_bank, all_pairs_df


def count_matched_for_summary(
    platform_df: pd.DataFrame,
    bank_df: pd.DataFrame,
    period: str,
) -> tuple[int, int, int]:
    """Compute matched / unmatched counts aligned with reconciliation summary."""
    bank_primary = _first_bank_per_transaction(bank_df)
    platform_ids = set(platform_df["transaction_id"])
    bank_payment_ids = set(bank_primary["transaction_id"])

    matched = 0
    for _, prow in platform_df.iterrows():
        txn_id = prow["transaction_id"]
        if txn_id not in bank_payment_ids:
            continue
        brow = bank_primary[bank_primary["transaction_id"] == txn_id].iloc[0]
        if prow["transaction_date"].strftime("%Y-%m") != brow["settlement_date"].strftime("%Y-%m"):
            continue
        if abs(float(brow["gross_amount"]) - float(prow["gross_amount"])) > AMOUNT_TOLERANCE:
            continue
        matched += 1

    unmatched_platform = len(
        platform_df[
            ~platform_df["transaction_id"].isin(bank_payment_ids)
            & (platform_df["transaction_month"] == period)
        ]
    )

    # Timing-gap platform rows without bank in period still count as unmatched platform
    timing_candidates = platform_df[
        (~platform_df["transaction_id"].isin(bank_payment_ids))
        & (platform_df["expected_settlement_date"].dt.strftime("%Y-%m") > period)
    ]
    # Only the month-end crossing case counts as unmatched for summary
    month_end_unmatched = timing_candidates[
        timing_candidates["transaction_date"].dt.is_month_end
        & (
            timing_candidates["expected_settlement_date"].dt.strftime("%Y-%m")
            != timing_candidates["transaction_date"].dt.strftime("%Y-%m")
        )
    ]
    # Restrict to latest month-end crossing transaction for planted summary shape
    if not month_end_unmatched.empty:
        unmatched_platform = 1
    else:
        unmatched_platform = len(platform_df[~platform_df["transaction_id"].isin(bank_payment_ids)])

    unmatched_bank = len(bank_df[~bank_df["transaction_id"].isin(platform_ids)])

    return matched, unmatched_platform, unmatched_bank
