import { cn } from "@/lib/utils";
import type { ReconciliationSummary } from "@/lib/types";

interface ReconciliationStatusBadgeProps {
  summary: ReconciliationSummary;
}

export function ReconciliationStatusBadge({ summary }: ReconciliationStatusBadgeProps) {
  const balanced =
    summary.net_variance === 0 && summary.discrepancy_count === 0;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center rounded-lg border px-6 py-4 font-display text-heading uppercase tracking-wide",
        balanced
          ? "border-success/40 bg-success-muted text-success shadow-glow-success"
          : "border-danger/40 bg-danger-muted text-danger shadow-glow-danger",
      )}
    >
      {balanced ? "✓ Reconciled" : "⚠ Discrepancies Found"}
    </div>
  );
}
