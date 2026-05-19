export type DiscrepancyType =
  | "TIMING_GAP"
  | "ROUNDING_DIFFERENCE"
  | "DUPLICATE_ENTRY"
  | "ORPHAN_REFUND"
  | "UNMATCHED_SETTLEMENT"
  | "AMOUNT_MISMATCH";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Discrepancy {
  discrepancy_id: string;
  transaction_id: string;
  discrepancy_type: DiscrepancyType;
  severity: Severity;
  platform_amount: number | null;
  bank_amount: number | null;
  delta: number;
  platform_date: string | null;
  bank_date: string | null;
  explanation: string;
  affected_batch: string | null;
  resolution_hint: string;
  metadata?: Record<string, unknown> | null;
}

export interface ReconciliationSummary {
  period: string;
  platform_transaction_count: number;
  bank_settlement_count: number;
  matched_count: number;
  unmatched_platform_count: number;
  unmatched_bank_count: number;
  platform_gross_total: number;
  bank_gross_total: number;
  net_variance: number;
  discrepancy_count: number;
  discrepancy_breakdown: Record<string, number>;
  severity_breakdown: Record<Severity, number>;
  reconciliation_rate: number;
}

export interface ReconciledTransaction {
  transaction_id: string;
  platform_date: string;
  settlement_date: string | null;
  platform_gross: number;
  bank_gross: number | null;
  status: "MATCHED" | "TIMING_GAP" | "AMOUNT_MISMATCH" | "UNMATCHED_PLATFORM";
}

export interface FullReconciliationResponse {
  summary: ReconciliationSummary;
  discrepancies: Discrepancy[];
  reconciled_transactions: ReconciledTransaction[];
  run_timestamp: string;
}

export interface FilterState {
  types: DiscrepancyType[];
  severities: Severity[];
  search: string;
}
