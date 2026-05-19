from __future__ import annotations

from pathlib import Path

import pandas as pd

PLATFORM_REQUIRED_COLUMNS = [
    "transaction_id",
    "customer_id",
    "type",
    "status",
    "transaction_date",
    "gross_amount",
    "processor_fee",
    "net_amount",
    "expected_settlement_date",
]

BANK_REQUIRED_COLUMNS = [
    "settlement_id",
    "batch_id",
    "transaction_id",
    "settlement_date",
    "type",
    "gross_amount",
    "processor_fee",
    "net_amount",
]


def _validate_columns(df: pd.DataFrame, required: list[str], label: str) -> None:
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"{label} CSV missing required columns: {', '.join(missing)}")


def _normalize_string_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    out = df.copy()
    for col in columns:
        if col in out.columns:
            out[col] = out[col].astype(str).str.strip()
    return out


def _parse_dates(df: pd.DataFrame, date_columns: list[str]) -> pd.DataFrame:
    out = df.copy()
    for col in date_columns:
        if col not in out.columns:
            continue
        parsed = pd.to_datetime(out[col], utc=True, errors="coerce")
        if parsed.isna().any():
            raise ValueError(f"Unable to parse dates in column '{col}'")
        out[col] = parsed
    return out


def _coerce_amounts(df: pd.DataFrame, amount_columns: list[str]) -> pd.DataFrame:
    out = df.copy()
    for col in amount_columns:
        out[col] = pd.to_numeric(out[col], errors="coerce").round(2)
        if out[col].isna().any():
            raise ValueError(f"Invalid numeric values in column '{col}'")
    return out


def _validate_transaction_ids(df: pd.DataFrame) -> None:
    if df["transaction_id"].isna().any() or (df["transaction_id"] == "").any():
        raise ValueError("transaction_id must not be null or empty")


def _validate_amount_signs(df: pd.DataFrame) -> None:
    payments = df["type"].str.lower() == "payment"
    refunds = df["type"].str.lower() == "refund"
    if (payments & (df["gross_amount"] <= 0)).any():
        raise ValueError("gross_amount must be > 0 for payment rows")
    if (refunds & (df["gross_amount"] >= 0)).any():
        raise ValueError("gross_amount must be < 0 for refund rows")


def load_platform(path: str) -> pd.DataFrame:
    """Load and validate the platform transactions CSV."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Platform CSV not found: {file_path}")

    df = pd.read_csv(file_path)
    _validate_columns(df, PLATFORM_REQUIRED_COLUMNS, "Platform")
    df = _normalize_string_columns(
        df,
        ["transaction_id", "customer_id", "type", "status"],
    )
    _validate_transaction_ids(df)
    df = _coerce_amounts(df, ["gross_amount", "processor_fee", "net_amount"])
    _validate_amount_signs(df)
    df = _parse_dates(df, ["transaction_date", "expected_settlement_date"])
    df["transaction_month"] = df["transaction_date"].dt.strftime("%Y-%m")
    return df


def load_bank(path: str) -> pd.DataFrame:
    """Load and validate the bank settlements CSV."""
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Bank CSV not found: {file_path}")

    df = pd.read_csv(file_path)
    _validate_columns(df, BANK_REQUIRED_COLUMNS, "Bank")
    df = _normalize_string_columns(
        df,
        ["settlement_id", "batch_id", "transaction_id", "type"],
    )
    _validate_transaction_ids(df)
    df = _coerce_amounts(df, ["gross_amount", "processor_fee", "net_amount"])
    _validate_amount_signs(df)
    df = _parse_dates(df, ["settlement_date"])
    df["settlement_month"] = df["settlement_date"].dt.strftime("%Y-%m")
    return df
