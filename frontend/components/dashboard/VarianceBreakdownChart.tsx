"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FullReconciliationResponse } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  TIMING_GAP: "#38BDF8",
  ROUNDING_DIFFERENCE: "#F5A623",
  DUPLICATE_ENTRY: "#E8455A",
  ORPHAN_REFUND: "#FF2D55",
  UNMATCHED_SETTLEMENT: "#4F7EFF",
  AMOUNT_MISMATCH: "#8B92A8",
};

interface VarianceBreakdownChartProps {
  data: FullReconciliationResponse;
}

export function VarianceBreakdownChart({ data }: VarianceBreakdownChartProps) {
  const countData = Object.entries(data.summary.discrepancy_breakdown).map(
    ([name, value]) => ({ name, value }),
  );
  const impactData = data.discrepancies.map((item) => ({
    name: item.discrepancy_type.replace(/_/g, " "),
    value: Math.abs(item.delta),
    type: item.discrepancy_type,
  }));

  return (
    <div className="grid h-80 grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-md border border-border bg-surface p-4">
        <h3 className="mb-2 font-display text-subheading">By Type (Count)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={countData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
            >
              {countData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={TYPE_COLORS[entry.name] ?? "#4F7EFF"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#141720",
                border: "1px solid #353B52",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-md border border-border bg-surface p-4">
        <h3 className="mb-2 font-display text-subheading">By Type ($ Impact)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={impactData}>
            <CartesianGrid stroke="#252A3A" strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis stroke="#8B92A8" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#141720",
                border: "1px solid #353B52",
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {impactData.map((entry) => (
                <Cell
                  key={entry.type}
                  fill={TYPE_COLORS[entry.type] ?? "#4F7EFF"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
