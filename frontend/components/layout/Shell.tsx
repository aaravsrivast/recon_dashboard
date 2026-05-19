"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface ShellProps {
  children: React.ReactNode;
  balanced: boolean;
  runTimestamp?: string;
  loading?: boolean;
  onRerun: () => void;
}

export function Shell({
  children,
  balanced,
  runTimestamp,
  loading,
  onRerun,
}: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          balanced={balanced}
          runTimestamp={runTimestamp}
          loading={loading}
          onRerun={onRerun}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
