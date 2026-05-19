"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FullReconciliationResponse } from "@/lib/types";

interface SettlementTimingChartProps {
  data: FullReconciliationResponse;
}

export function SettlementTimingChart({ data }: SettlementTimingChartProps) {
  const chartData = buildDailyVolumes(data);

  return (
    <div className="h-80 rounded-md border border-border bg-surface p-4">
      <h3 className="mb-4 font-display text-subheading">Settlement Timing</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={chartData}>
          <CartesianGrid stroke="#252A3A" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#8B92A8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#8B92A8" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#141720",
              border: "1px solid #353B52",
              borderRadius: 8,
            }}
          />
          <Bar
            dataKey="platform"
            fill="#4F7EFF"
            radius={[4, 4, 0, 0]}
            name="Platform volume"
          />
          <Line
            type="monotone"
            dataKey="bank"
            stroke="#1DB87E"
            strokeWidth={2}
            dot={false}
            name="Bank settlements"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildDailyVolumes(data: FullReconciliationResponse) {
  const platformByDay: Record<string, number> = {};
  const bankByDay: Record<string, number> = {};

  for (const row of data.reconciled_transactions) {
    if (row.platform_date?.startsWith("2025-01")) {
      platformByDay[row.platform_date] = (platformByDay[row.platform_date] ?? 0) + 1;
    }
    if (row.settlement_date?.startsWith("2025-01")) {
      bankByDay[row.settlement_date] = (bankByDay[row.settlement_date] ?? 0) + 1;
    }
  }

  const days = Array.from({ length: 31 }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const date = `2025-01-${day}`;
    return {
      date: `Jan ${index + 1}`,
      platform: platformByDay[date] ?? 0,
      bank: bankByDay[date] ?? 0,
      lag: (platformByDay[date] ?? 0) - (bankByDay[date] ?? 0),
      highlight: date === "2025-01-31",
    };
  });

  return days;
}
