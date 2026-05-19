"use client";

import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Discrepancy } from "@/lib/types";

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

interface AiExplanationPanelProps {
  discrepancies: Discrepancy[];
}

export function AiExplanationPanel({ discrepancies }: AiExplanationPanelProps) {
  const sorted = [...discrepancies].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const [index, setIndex] = useState(0);
  const current = sorted[index];

  if (!current) {
    return null;
  }

  const copyHint = async () => {
    await navigator.clipboard.writeText(current.resolution_hint);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-surface p-5 shadow-glow-accent animate-fade-in">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse-slow" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <h3 className="font-display text-subheading">Reconciliation Intelligence</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIndex((index - 1 + sorted.length) % sorted.length)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-data text-caption text-text-muted">
            {index + 1} / {sorted.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIndex((index + 1) % sorted.length)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-body leading-relaxed text-text-primary">{current.explanation}</p>
      <div className="mt-4 flex items-start justify-between gap-4 rounded-md border border-border bg-canvas-subtle p-4">
        <p className="text-caption text-text-secondary">{current.resolution_hint}</p>
        <Button variant="outline" size="sm" onClick={copyHint}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </Button>
      </div>
    </div>
  );
}
