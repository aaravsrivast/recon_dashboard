import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Landmark,
  Scale,
  Sigma,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { formatCurrency } from "@/lib/utils";
import type { FullReconciliationResponse, Severity } from "@/lib/types";

interface MetricsRowProps {
  data: FullReconciliationResponse;
}

function worstSeverity(data: FullReconciliationResponse): Severity | undefined {
  const order: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  for (const level of order) {
    if ((data.summary.severity_breakdown[level] ?? 0) > 0) {
      return level;
    }
  }
  return undefined;
}

export function MetricsRow({ data }: MetricsRowProps) {
  const { summary, discrepancies } = data;
  const rounding = discrepancies.find(
    (item) => item.discrepancy_type === "ROUNDING_DIFFERENCE",
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <MetricCard
        label="Platform Transactions"
        value={summary.platform_transaction_count}
        delta={`${summary.platform_transaction_count} recorded`}
        icon={Building2}
      />
      <MetricCard
        label="Bank Settlements"
        value={summary.bank_settlement_count}
        delta={`${summary.bank_settlement_count} settlement rows`}
        icon={Landmark}
      />
      <MetricCard
        label="Matched"
        value={summary.matched_count}
        delta={`${summary.reconciliation_rate}% reconciliation rate`}
        deltaType="positive"
        icon={CheckCircle2}
      />
      <MetricCard
        label="Net Variance"
        value={summary.net_variance}
        format="currency"
        deltaType={summary.net_variance === 0 ? "neutral" : "negative"}
        icon={Scale}
        severity={summary.net_variance !== 0 ? "HIGH" : undefined}
      />
      <MetricCard
        label="Discrepancies Found"
        value={summary.discrepancy_count}
        delta={`${summary.unmatched_platform_count} platform / ${summary.unmatched_bank_count} bank unmatched`}
        severity={worstSeverity(data)}
        icon={AlertTriangle}
      />
      <MetricCard
        label="Rounding Gap"
        value={rounding?.delta ?? 0}
        format="currency"
        delta={
          rounding?.metadata
            ? `${String(rounding.metadata.contributing_count ?? 0)} transactions`
            : "No rounding drift"
        }
        deltaType="neutral"
        severity="MEDIUM"
        icon={Sigma}
      />
    </div>
  );
}
