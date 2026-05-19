"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DiscrepancyType, FilterState, Severity } from "@/lib/types";

const ALL_TYPES: DiscrepancyType[] = [
  "TIMING_GAP",
  "ROUNDING_DIFFERENCE",
  "DUPLICATE_ENTRY",
  "ORPHAN_REFUND",
  "UNMATCHED_SETTLEMENT",
  "AMOUNT_MISMATCH",
];

const ALL_SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

interface AnomalyFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function AnomalyFilterBar({ filters, onChange }: AnomalyFilterBarProps) {
  const activeCount =
    filters.types.length +
    filters.severities.length +
    (filters.search ? 1 : 0);

  const toggleType = (type: DiscrepancyType) => {
    const types = filters.types.includes(type)
      ? filters.types.filter((item) => item !== type)
      : [...filters.types, type];
    onChange({ ...filters, types });
  };

  const toggleSeverity = (severity: Severity) => {
    const severities = filters.severities.includes(severity)
      ? filters.severities.filter((item) => item !== severity)
      : [...filters.severities, severity];
    onChange({ ...filters, severities });
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-subheading text-text-primary">Filters</h3>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <Badge variant="accent">{activeCount} active</Badge>
          )}
          <button
            type="button"
            className="text-caption text-accent hover:underline"
            onClick={() =>
              onChange({ types: [], severities: [], search: "" })
            }
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            className={cn(
              "rounded-xs border px-2 py-1 font-data text-mono-sm transition-colors",
              filters.types.includes(type)
                ? "border-accent bg-accent-muted text-accent"
                : "border-border text-text-secondary hover:border-border-strong",
            )}
          >
            {type.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_SEVERITIES.map((severity) => (
          <button
            key={severity}
            type="button"
            onClick={() => toggleSeverity(severity)}
            className={cn(
              "rounded-xs border px-2 py-1 font-data text-mono-sm transition-colors",
              filters.severities.includes(severity)
                ? "border-accent bg-accent-muted text-accent"
                : "border-border text-text-secondary",
            )}
          >
            {severity}
          </button>
        ))}
      </div>

      <Input
        placeholder="Search transaction ID or explanation..."
        value={filters.search}
        onChange={(event) =>
          onChange({ ...filters, search: event.target.value })
        }
      />
    </div>
  );
}
