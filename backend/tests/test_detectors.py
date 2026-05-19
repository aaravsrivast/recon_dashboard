from __future__ import annotations

from pathlib import Path

from backend.engine.detectors import (
    detect_duplicates,
    detect_orphan_refunds,
    detect_rounding_differences,
    detect_timing_gaps,
)
from backend.engine.loader import load_bank, load_platform
from backend.engine.matcher import match_transactions
from backend.models.schemas import DiscrepancyType

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture_data():
    platform_df = load_platform(str(FIXTURES / "mini_platform.csv"))
    bank_df = load_bank(str(FIXTURES / "mini_bank.csv"))
    matched_df, _, _, _ = match_transactions(platform_df, bank_df, "2025-01")
    return platform_df, bank_df, matched_df


def test_detect_timing_gap_finds_p009() -> None:
    platform_df, bank_df, matched_df = _load_fixture_data()
    gaps = detect_timing_gaps(platform_df, bank_df, matched_df)
    txn_ids = {item.transaction_id for item in gaps}
    assert "P-009" in txn_ids


def test_detect_rounding_finds_aggregate_delta() -> None:
    platform_df, bank_df, _ = _load_fixture_data()
    rounding = detect_rounding_differences(platform_df, bank_df)
    assert len(rounding) == 1
    assert rounding[0].transaction_id == "AGGREGATE"
    assert rounding[0].discrepancy_type == DiscrepancyType.ROUNDING_DIFFERENCE
    assert rounding[0].metadata is not None
    assert "P-010" in rounding[0].metadata["contributing_transactions"]


def test_detect_duplicate_finds_p011() -> None:
    _, bank_df, _ = _load_fixture_data()
    dupes = detect_duplicates(bank_df)
    assert any(item.transaction_id == "P-011" for item in dupes)


def test_detect_orphan_refund_finds_ghost_txn() -> None:
    platform_df, bank_df, _ = _load_fixture_data()
    orphans = detect_orphan_refunds(platform_df, bank_df)
    assert any(item.transaction_id == "TXN-GHOST" for item in orphans)


def test_no_false_positives_on_clean_data(tmp_path: Path) -> None:
    platform = FIXTURES / "mini_platform.csv"
    bank = FIXTURES / "mini_bank.csv"
    clean_platform = tmp_path / "clean_platform.csv"
    clean_bank = tmp_path / "clean_bank.csv"
    clean_platform.write_text(
        platform.read_text()
        .replace("P-009", "PX-009")
        .replace("2025-01-31", "2025-01-15")
        .replace("2025-02-01", "2025-01-16")
    )
    clean_bank.write_text(
        bank.read_text()
        .replace("SETL-011B,BATCH-ERR,P-011,2025-01-12,payment,1706.75,49.80,1656.95\n", "")
        .replace("SETL-GHOST,BATCH-ERR,TXN-GHOST,2025-01-14,refund,-150.00,0.00,-150.00\n", "")
        .replace("P-010,2025-01-11,payment,500.00,14.49,485.51", "P-010,2025-01-11,payment,500.00,14.50,485.50")
        + "\nSETL-009,BATCH-01,PX-009,2025-01-16,payment,1972.49,57.50,1914.99\n"
    )
    platform_df = load_platform(str(clean_platform))
    bank_df = load_bank(str(clean_bank))
    matched_df, _, _, _ = match_transactions(platform_df, bank_df, "2025-01")
    assert detect_timing_gaps(platform_df, bank_df, matched_df) == []
    assert detect_duplicates(bank_df) == []
    assert detect_orphan_refunds(platform_df, bank_df) == []
    assert detect_rounding_differences(platform_df, bank_df) == []
