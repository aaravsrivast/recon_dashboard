"use client";

import { useCallback, useEffect, useState } from "react";

import { AiExplanationPanel } from "@/components/dashboard/AiExplanationPanel";
import { AnomalyFilterBar } from "@/components/dashboard/AnomalyFilterBar";
import { DiscrepancyTable } from "@/components/dashboard/DiscrepancyTable";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { ReconciliationStatusBadge } from "@/components/dashboard/ReconciliationStatusBadge";
import { SettlementTimingChart } from "@/components/dashboard/SettlementTimingChart";
import { VarianceBreakdownChart } from "@/components/dashboard/VarianceBreakdownChart";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { runReconciliation } from "@/lib/api";
import type { FilterState, FullReconciliationResponse } from "@/lib/types";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-16 skeleton-shimmer rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 skeleton-shimmer rounded-md" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-80 skeleton-shimmer rounded-md lg:col-span-3" />
        <div className="h-80 skeleton-shimmer rounded-md lg:col-span-2" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 skeleton-shimmer rounded-sm" />
        ))}
      </div>
    </div>
  );
}

interface DashboardViewProps {
  initialData?: FullReconciliationResponse | null;
}

export function DashboardView({ initialData }: DashboardViewProps) {
  const [data, setData] = useState<FullReconciliationResponse | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    severities: [],
    search: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runReconciliation();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      void load();
    }
  }, [initialData, load]);

  const balanced =
    data?.summary.net_variance === 0 && data?.summary.discrepancy_count === 0;

  if (loading && !data) {
    return (
      <Shell balanced={false} loading onRerun={load}>
        <DashboardSkeleton />
      </Shell>
    );
  }

  if (error && !data) {
    return (
      <Shell balanced={false} loading={loading} onRerun={load}>
        <div className="rounded-md border border-danger/40 bg-danger-muted p-6 text-center">
          <p className="text-body text-danger">{error}</p>
          <Button className="mt-4" onClick={load}>
            Retry
          </Button>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Shell
      balanced={Boolean(balanced)}
      runTimestamp={data.run_timestamp}
      loading={loading}
      onRerun={load}
    >
      <div className="space-y-6 animate-slide-up">
        <ReconciliationStatusBadge summary={data.summary} />
        <MetricsRow data={data} />
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SettlementTimingChart data={data} />
          </div>
          <div className="lg:col-span-2">
            <VarianceBreakdownChart data={data} />
          </div>
        </div>
        <AnomalyFilterBar filters={filters} onChange={setFilters} />
        <DiscrepancyTable discrepancies={data.discrepancies} filters={filters} />
        <AiExplanationPanel discrepancies={data.discrepancies} />
      </div>
    </Shell>
  );
}
