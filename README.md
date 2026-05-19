# ReconFlow — Fintech Reconciliation Dashboard

ReconFlow is a production-oriented payments reconciliation platform for finance operations teams. It ingests platform transaction ledgers and bank settlement files, runs a rules-based reconciliation engine to detect financial anomalies, and presents results in a dark, data-dense SaaS dashboard.

## Architecture

```
┌─────────────────┐     HTTP/JSON      ┌──────────────────┐
│  Next.js 15     │ ◄────────────────► │  FastAPI         │
│  (frontend/)    │   /api/reconcile   │  (backend/)      │
└────────┬────────┘                    └────────┬─────────┘
         │                                        │
         │                                        ▼
         │                               ┌──────────────────┐
         │                               │  Engine          │
         │                               │  loader/matcher  │
         │                               │  detectors       │
         │                               └────────┬─────────┘
         │                                        │
         ▼                                        ▼
   Dashboard UI                          data/*.csv
```

## Detected anomalies

| ID | Type | Description |
|----|------|-------------|
| A | `TIMING_GAP` | Platform transaction settles in a later period than recorded (month-end cutoff). |
| B | `ROUNDING_DIFFERENCE` | Bank truncated processor fees vs platform rounding; surfaced as one aggregate variance. |
| C | `DUPLICATE_ENTRY` | Same `transaction_id` appears more than once in bank payment settlements. |
| D | `ORPHAN_REFUND` | Bank refund with no matching platform transaction. |

## Setup: local development

**Requirements:** Python 3.11+, Node 20+

From the repository root (after `git clone`):

```bash
# Backend
python3 -m pip install -r backend/requirements.txt
cp .env.example .env.local

# Frontend
cd frontend && npm install
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local` at the project root (or `frontend/.env.local`).

```bash
# Terminal 1 — API (repository root)
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000

# Terminal 2 — UI
cd frontend && npm run dev
```

Open http://localhost:3000/dashboard

## Setup: Vercel deployment

1. Import the repository into Vercel.
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — your deployment URL (e.g. `https://your-app.vercel.app`)
   - `ALLOWED_ORIGIN` — frontend origin for CORS
   - `ANTHROPIC_API_KEY` (optional) — for future LLM explanations
3. Deploy. `vercel.json` routes `/api/*` to the Python function and all other paths to Next.js.

## API reference

### `GET /api/health`

```json
{ "status": "ok", "version": "1.0.0", "timestamp": "2025-01-15T12:00:00+00:00" }
```

### `POST /api/reconcile`

Runs the full pipeline on default CSVs in `/data/` or optional paths in the body.

```json
{ "platform_path": "data/platform_transactions.csv", "bank_path": "data/bank_settlements.csv" }
```

Returns `FullReconciliationResponse` with `summary`, `discrepancies`, and `reconciled_transactions`.

### `GET /api/summary`

Returns the cached `ReconciliationSummary` from the last reconcile run (404 if none).

### `GET /api/discrepancies?type=TIMING_GAP&severity=HIGH&limit=100&offset=0`

Paginated discrepancy list with optional filters.

### `POST /api/upload`

Multipart form: `platform_file`, `bank_file` (CSV). Validates and returns row counts.

## Running tests

```bash
PYTHONPATH=. pytest backend/tests -v
```

## Extending the system

- **New detectors:** Add a function in `backend/engine/detectors.py`, register it in `backend/engine/reconcile.py`, and extend `DiscrepancyType` in `schemas.py` and `frontend/lib/types.ts`.
- **LLM explanations:** Set `ANTHROPIC_API_KEY` and implement `llm_explain` in `backend/engine/explainer.py`.
- **Database:** Replace CSV loader with a repository layer; keep detector interfaces on `pandas.DataFrame` for minimal churn.
