from __future__ import annotations

from pathlib import Path

import pytest

from backend.engine.loader import load_bank, load_platform

FIXTURES = Path(__file__).parent / "fixtures"


def test_load_platform_happy_path() -> None:
    df = load_platform(str(FIXTURES / "mini_platform.csv"))
    assert len(df) == 12
    assert "transaction_month" in df.columns
    assert df["gross_amount"].dtype == float


def test_load_bank_happy_path() -> None:
    df = load_bank(str(FIXTURES / "mini_bank.csv"))
    assert len(df) == 13
    assert "settlement_month" in df.columns


def test_missing_column_raises_value_error() -> None:
    bad_csv = FIXTURES / "mini_platform.csv"
    content = bad_csv.read_text().replace("transaction_id", "txn_id")
    tmp = FIXTURES / "bad_platform.csv"
    tmp.write_text(content)
    try:
        with pytest.raises(ValueError, match="missing required columns"):
            load_platform(str(tmp))
    finally:
        tmp.unlink(missing_ok=True)


def test_null_transaction_id_raises(tmp_path: Path) -> None:
    src = (FIXTURES / "mini_platform.csv").read_text()
    broken = src.replace("P-001", "")
    path = tmp_path / "broken.csv"
    path.write_text(broken)
    with pytest.raises(ValueError, match="transaction_id"):
        load_platform(str(path))


def test_amounts_coerced_to_float() -> None:
    df = load_platform(str(FIXTURES / "mini_platform.csv"))
    assert df.loc[0, "gross_amount"] == 100.0
    assert df.loc[0, "processor_fee"] == 2.9
