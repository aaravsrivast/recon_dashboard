import type {
  Discrepancy,
  DiscrepancyType,
  FullReconciliationResponse,
  ReconciliationSummary,
  Severity,
} from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiError {
  detail?: string;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(payload.detail ?? payload.error ?? response.statusText);
  }
  return response.json() as Promise<T>;
}

export async function fetchHealth(): Promise<{ status: string }> {
  const response = await fetch(`${BASE}/api/health`, { cache: "no-store" });
  return handleResponse(response);
}

export async function runReconciliation(): Promise<FullReconciliationResponse> {
  const response = await fetch(`${BASE}/api/reconcile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    cache: "no-store",
  });
  return handleResponse(response);
}

export async function fetchSummary(): Promise<ReconciliationSummary> {
  const response = await fetch(`${BASE}/api/summary`, { cache: "no-store" });
  return handleResponse(response);
}

export async function fetchDiscrepancies(filters?: {
  type?: DiscrepancyType;
  severity?: Severity;
  limit?: number;
  offset?: number;
}): Promise<Discrepancy[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters?.offset !== undefined) params.set("offset", String(filters.offset));
  const query = params.toString();
  const response = await fetch(
    `${BASE}/api/discrepancies${query ? `?${query}` : ""}`,
    { cache: "no-store" },
  );
  return handleResponse(response);
}

export async function uploadFiles(
  platformFile: File,
  bankFile: File,
): Promise<{ status: string; platform_rows: number; bank_rows: number }> {
  const form = new FormData();
  form.append("platform_file", platformFile);
  form.append("bank_file", bankFile);
  const response = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    body: form,
  });
  return handleResponse(response);
}
