import type { LucideIcon } from "lucide-react";

import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { Severity } from "@/lib/types";

export interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  format?: "currency" | "number" | "percent";
  severity?: Severity;
  description?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaType = "neutral",
  icon: Icon,
  format = "number",
  severity,
  description,
}: MetricCardProps) {
  let displayValue = String(value);
  if (format === "currency" && typeof value === "number") {
    displayValue = formatCurrency(value);
  } else if (format === "percent" && typeof value === "number") {
    displayValue = formatPercent(value);
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface p-4 shadow-card transition-all hover:border-border-strong hover:shadow-raised",
        severity === "HIGH" && "border-severity-high/40",
        severity === "CRITICAL" && "border-severity-critical/40",
        severity === "MEDIUM" && "border-severity-medium/40",
      )}
      title={description}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-caption text-text-secondary">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-text-muted" />}
      </div>
      <p className="font-data text-display text-text-primary">{displayValue}</p>
      {delta && (
        <p
          className={cn(
            "mt-2 font-data text-caption",
            deltaType === "positive" && "text-success",
            deltaType === "negative" && "text-danger",
            deltaType === "neutral" && "text-text-muted",
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}
