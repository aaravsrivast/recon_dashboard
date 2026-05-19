"use client";

import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cn,
  exportDiscrepanciesCsv,
  formatCurrency,
  typeColor,
} from "@/lib/utils";
import type { Discrepancy, FilterState } from "@/lib/types";

type SortKey = keyof Discrepancy | "row";
type SortDir = "asc" | "desc";

interface DiscrepancyTableProps {
  discrepancies: Discrepancy[];
  filters: FilterState;
}

const PAGE_SIZE = 25;

export function DiscrepancyTable({ discrepancies, filters }: DiscrepancyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return discrepancies.filter((row) => {
      if (filters.types.length > 0 && !filters.types.includes(row.discrepancy_type)) {
        return false;
      }
      if (
        filters.severities.length > 0 &&
        !filters.severities.includes(row.severity)
      ) {
        return false;
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        return (
          row.transaction_id.toLowerCase().includes(query) ||
          row.explanation.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [discrepancies, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let left: string | number = "";
      let right: string | number = "";
      if (sortKey === "row") {
        left = a.discrepancy_id;
        right = b.discrepancy_id;
      } else {
        left = (a[sortKey] ?? "") as string | number;
        right = (b[sortKey] ?? "") as string | number;
      }
      if (typeof left === "number" && typeof right === "number") {
        return sortDir === "asc" ? left - right : right - left;
      }
      return sortDir === "asc"
        ? String(left).localeCompare(String(right))
        : String(right).localeCompare(String(left));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const severityVariant = (severity: Discrepancy["severity"]) => {
    if (severity === "LOW") return "success" as const;
    if (severity === "MEDIUM") return "warning" as const;
    return "danger" as const;
  };

  const exportRows = sorted.map((row) => ({
    discrepancy_id: row.discrepancy_id,
    transaction_id: row.transaction_id,
    discrepancy_type: row.discrepancy_type,
    severity: row.severity,
    platform_amount: row.platform_amount,
    bank_amount: row.bank_amount,
    delta: row.delta,
    platform_date: row.platform_date,
    bank_date: row.bank_date,
    explanation: row.explanation,
  }));

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-display text-subheading">Discrepancies</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportDiscrepanciesCsv(exportRows, "discrepancies-export.csv")
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-body">
          <thead className="border-b border-border bg-canvas-subtle text-caption text-text-secondary">
            <tr>
              {[
                ["row", "#"],
                ["discrepancy_id", "ID"],
                ["discrepancy_type", "Type"],
                ["transaction_id", "Transaction"],
                ["severity", "Severity"],
                ["platform_amount", "Platform $"],
                ["bank_amount", "Bank $"],
                ["delta", "Delta"],
                ["platform_date", "Date"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  className="cursor-pointer px-3 py-2 font-medium hover:text-text-primary"
                  onClick={() => toggleSort(key as SortKey)}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {sortKey === key &&
                      (sortDir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <Fragment key={row.discrepancy_id}>
                <tr
                  className="cursor-pointer border-b border-border/60 hover:bg-surface-raised"
                  onClick={() =>
                    setExpanded(
                      expanded === row.discrepancy_id
                        ? null
                        : row.discrepancy_id,
                    )
                  }
                >
                  <td className="px-3 py-2 text-text-muted">
                    {page * PAGE_SIZE + index + 1}
                  </td>
                  <td className="px-3 py-2 font-data text-data">{row.discrepancy_id}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded-xs px-2 py-0.5 font-data text-mono-sm",
                        typeColor(row.discrepancy_type),
                      )}
                    >
                      {row.discrepancy_type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-data text-data">
                    {row.transaction_id}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={severityVariant(row.severity)}
                      className={cn(
                        row.severity === "CRITICAL" && "shadow-glow-danger",
                      )}
                    >
                      {row.severity}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right font-data">
                    {formatCurrency(row.platform_amount)}
                  </td>
                  <td className="px-3 py-2 text-right font-data">
                    {formatCurrency(row.bank_amount)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-data",
                      row.delta < 0 ? "text-danger" : "text-success",
                    )}
                  >
                    {formatCurrency(row.delta)}
                  </td>
                  <td className="px-3 py-2 font-data text-caption">
                    {row.platform_date ?? row.bank_date ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-caption text-accent">View</td>
                </tr>
                {expanded === row.discrepancy_id && (
                  <tr className="bg-canvas-subtle">
                    <td colSpan={10} className="px-4 py-3">
                      <p className="text-body text-text-primary">{row.explanation}</p>
                      <p className="mt-2 text-caption text-text-secondary">
                        {row.resolution_hint}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-caption text-text-muted">
          Showing {pageRows.length} of {sorted.length}
        </span>
        <div className="flex gap-2">
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
            disabled={page >= pageCount - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
