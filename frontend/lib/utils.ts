import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { DiscrepancyType, Severity } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const UTC_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** UTC datetime string; manual format avoids Node vs browser Intl differences during SSR. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  const month = UTC_MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year}, ${hours}:${minutes} ${period}`;
}

export function severityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    LOW: "text-severity-low",
    MEDIUM: "text-severity-medium",
    HIGH: "text-severity-high",
    CRITICAL: "text-severity-critical",
  };
  return map[severity];
}

export function typeColor(type: DiscrepancyType): string {
  const map: Record<DiscrepancyType, string> = {
    TIMING_GAP: "bg-info-muted text-info",
    ROUNDING_DIFFERENCE: "bg-warning-muted text-warning",
    DUPLICATE_ENTRY: "bg-danger-muted text-danger",
    ORPHAN_REFUND: "bg-danger-muted text-danger",
    UNMATCHED_SETTLEMENT: "bg-accent-muted text-accent",
    AMOUNT_MISMATCH: "bg-warning-muted text-warning",
  };
  return map[type];
}

export function exportDiscrepanciesCsv(
  rows: { [key: string]: string | number | null }[],
  filename: string,
): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = value === null ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
