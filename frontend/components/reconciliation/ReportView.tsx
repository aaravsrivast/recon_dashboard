"use client";

import { useCallback, useEffect, useState } from "react";

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { runReconciliation } from "@/lib/api";
import {
  exportDiscrepanciesCsv,
  formatCurrency,
  formatDateTime,
} from "@/lib/utils";
import type { Discrepancy, FullReconciliationResponse, ReconciledTransaction } from "@/lib/types";

const PAGE_SIZE = 50;

export function ReportView() {
  const [data, setData] = useState<FullReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [openType, setOpenType] = useState<string | null>("TIMING_GAP");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await runReconciliation());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !data) {
    return (
      <Shell balanced={false} loading onRerun={load}>
        <div className="h-96 skeleton-shimmer rounded-md" />
      </Shell>
    );
  }

  const matched = data.reconciled_transactions.filter(
    (row) => row.status === "MATCHED",
  );
  const pageRows = matched.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const balanced =
    data.summary.net_variance === 0 && data.summary.discrepancy_count === 0;

  return (
    <Shell
      balanced={balanced}
      runTimestamp={data.run_timestamp}
      loading={loading}
      onRerun={load}
    >
      <div className="space-y-8">
        <header className="rounded-md border border-border bg-surface p-6">
          <h1 className="font-display text-display text-text-primary">
            Reconciliation Report
          </h1>
          <p className="mt-2 text-body text-text-secondary">
            Period {data.summary.period} · Run {formatDateTime(data.run_timestamp)} ·{" "}
            {balanced ? "Reconciled" : "Discrepancies found"}
          </p>
        </header>

        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-heading">Matched Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-canvas-subtle text-caption text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Transaction ID</th>
                  <th className="px-3 py-2 text-left">Platform Date</th>
                  <th className="px-3 py-2 text-left">Settlement Date</th>
                  <th className="px-3 py-2 text-left">Lag (days)</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row: ReconciledTransaction) => (
                  <tr key={row.transaction_id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-data">{row.transaction_id}</td>
                    <td className="px-3 py-2 font-data">{row.platform_date}</td>
                    <td className="px-3 py-2 font-data">{row.settlement_date ?? "—"}</td>
                    <td className="px-3 py-2 font-data">
                      {lagDays(row.platform_date, row.settlement_date)}
                    </td>
                    <td className="px-3 py-2 text-right font-data">
                      {formatCurrency(row.platform_gross)}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * PAGE_SIZE >= matched.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-heading">Discrepancy Deep-Dive</h2>
          {data.discrepancies.map((disc) => (
            <TypeCard
              key={disc.discrepancy_id}
              disc={disc}
              open={openType === disc.discrepancy_type}
              onToggle={() =>
                setOpenType(
                  openType === disc.discrepancy_type
                    ? null
                    : disc.discrepancy_type,
                )
              }
            />
          ))}
        </section>

        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="mb-3 font-display text-heading">Export</h2>
          <Button
            onClick={() =>
              exportDiscrepanciesCsv(
                data.discrepancies.map((row) => ({
                  discrepancy_id: row.discrepancy_id,
                  transaction_id: row.transaction_id,
                  discrepancy_type: row.discrepancy_type,
                  severity: row.severity,
                  delta: row.delta,
                  explanation: row.explanation,
                })),
                "reconciliation-discrepancies.csv",
              )
            }
          >
            Download discrepancies CSV
          </Button>
        </section>
      </div>
    </Shell>
  );
}

function lagDays(platformDate: string, settlementDate: string | null): number {
  if (!settlementDate) return 0;
  const start = new Date(platformDate).getTime();
  const end = new Date(settlementDate).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function TypeCard({
  disc,
  open,
  onToggle,
}: {
  disc: Discrepancy;
  open: boolean;
  onToggle: () => void;
}) {
  const contributing =
    (disc.metadata?.contributing_transactions as string[] | undefined) ?? [];

  return (
    <div className="rounded-md border border-border bg-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={onToggle}
      >
        <span className="font-display text-subheading">
          {disc.discrepancy_type.replace(/_/g, " ")}
        </span>
        <span className="font-data text-caption text-text-muted">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 text-body">
          <p className="text-text-primary">{disc.explanation}</p>
          {disc.discrepancy_type === "ROUNDING_DIFFERENCE" && contributing.length > 0 && (
            <div className="mt-4 max-h-48 overflow-auto">
              <table className="w-full font-data text-caption">
                <thead>
                  <tr className="text-text-muted">
                    <th className="py-1 text-left">Transaction</th>
                    <th className="py-1 text-right">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {contributing.map((txn) => (
                    <tr key={txn} className="border-t border-border/40">
                      <td className="py-1">{txn}</td>
                      <td className="py-1 text-right">$0.01</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {disc.discrepancy_type === "DUPLICATE_ENTRY" && (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <div className="rounded border border-border p-3">
                <p className="text-caption text-text-muted">Original</p>
                <p className="font-data">{formatCurrency(disc.platform_amount)}</p>
              </div>
              <div className="rounded border border-danger/40 p-3">
                <p className="text-caption text-text-muted">Duplicate</p>
                <p className="font-data text-danger">{formatCurrency(disc.bank_amount)}</p>
              </div>
            </div>
          )}
          {disc.discrepancy_type === "ORPHAN_REFUND" && (
            <p className="mt-3 font-data text-danger">No match found in platform ledger</p>
          )}
          {disc.discrepancy_type === "TIMING_GAP" && (
            <div className="mt-4 flex items-center gap-3 font-data text-caption">
              <span>{disc.platform_date}</span>
              <span className="text-text-muted">→</span>
              <span>{disc.bank_date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
