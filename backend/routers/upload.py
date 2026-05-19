from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.engine.loader import load_bank, load_platform

router = APIRouter()

_upload_dir: Path | None = None


def get_upload_dir() -> Path:
    global _upload_dir
    if _upload_dir is None:
        _upload_dir = Path(tempfile.mkdtemp(prefix="recon_upload_"))
    return _upload_dir


@router.post("/upload")
async def upload_files(
    platform_file: UploadFile = File(...),
    bank_file: UploadFile = File(...),
) -> dict[str, int | str]:
    upload_dir = get_upload_dir()
    platform_path = upload_dir / "platform_transactions.csv"
    bank_path = upload_dir / "bank_settlements.csv"

    try:
        platform_bytes = await platform_file.read()
        bank_bytes = await bank_file.read()
        platform_path.write_bytes(platform_bytes)
        bank_path.write_bytes(bank_bytes)

        platform_df = load_platform(str(platform_path))
        bank_df = load_bank(str(bank_path))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "status": "accepted",
        "platform_rows": len(platform_df),
        "bank_rows": len(bank_df),
    }
