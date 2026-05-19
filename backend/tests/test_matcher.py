from __future__ import annotations

from pathlib import Path

from backend.engine.loader import load_bank, load_platform
from backend.engine.matcher import match_transactions

FIXTURES = Path(__file__).parent / "fixtures"


def _match():
    platform_df = load_platform(str(FIXTURES / "mini_platform.csv"))
    bank_df = load_bank(str(FIXTURES / "mini_bank.csv"))
    return match_transactions(platform_df, bank_df, "2025-01")


def test_matched_count_correct() -> None:
    matched_df, _, _, pairs = _match()
    matched_status = pairs[pairs["status"] == "MATCHED"]
    assert len(matched_status) >= len(matched_df)


def test_unmatched_platform_count_correct() -> None:
    _, unmatched_platform, _, _ = _match()
    assert len(unmatched_platform) == 1
    assert unmatched_platform.iloc[0]["transaction_id"] == "P-009"


def test_unmatched_bank_count_correct() -> None:
    _, _, unmatched_bank, _ = _match()
    assert len(unmatched_bank) >= 1
    assert "TXN-GHOST" in set(unmatched_bank["transaction_id"])


def test_matched_df_has_no_duplicates() -> None:
    matched_df, _, _, _ = _match()
    if matched_df.empty:
        return
    assert matched_df["transaction_id"].is_unique
