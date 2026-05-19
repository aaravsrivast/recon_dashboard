"use client";

import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

interface TopBarProps {
  balanced: boolean;
  runTimestamp?: string;
  loading?: boolean;
  onRerun: () => void;
}

export function TopBar({ balanced, runTimestamp, loading, onRerun }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-canvas-subtle px-4 md:px-6">
      <div className="flex items-center gap-4">
        <span className="font-data text-mono-sm uppercase tracking-wider text-text-secondary">
          January 2025
        </span>
        <span
          className={cn(
            "rounded-xs px-2 py-0.5 font-data text-mono-sm uppercase",
            balanced
              ? "bg-success-muted text-success shadow-glow-success"
              : "bg-danger-muted text-danger shadow-glow-danger",
          )}
        >
          {balanced ? "Balanced" : "Discrepancies Found"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {runTimestamp && (
          <span className="hidden text-caption text-text-muted sm:inline">
            Last run: {formatDateTime(runTimestamp)}
          </span>
        )}
        <Button size="sm" onClick={onRerun} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Re-run Reconciliation
        </Button>
      </div>
    </header>
  );
}
