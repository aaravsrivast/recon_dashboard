"use client";

import { GitCompare, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reconciliation", label: "Reconciliation Report", icon: GitCompare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col border-r border-border bg-canvas-subtle md:w-60">
      <div className="border-b border-border px-3 py-5 md:px-4">
        <div className="flex items-center gap-3">
          <div className="relative mx-auto h-9 w-9 shrink-0 md:mx-0">
            <span className="absolute left-0 top-1 h-6 w-6 rounded-full bg-accent/80" />
            <span className="absolute right-0 top-2 h-6 w-6 rounded-full border-2 border-accent bg-canvas-subtle" />
          </div>
          <div className="hidden md:block">
            <p className="font-display text-subheading font-semibold text-text-primary">
              ReconFlow
            </p>
            <p className="text-caption text-text-muted">Payments Reconciliation</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2 md:p-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center gap-3 rounded-sm px-2 py-2 text-body transition-colors md:justify-start md:px-3",
                active
                  ? "border-l-2 border-accent bg-accent-muted text-text-primary"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary",
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
        <div className="my-3 hidden border-t border-border md:block" />
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-sm px-2 py-2 text-body text-text-muted md:justify-start md:px-3"
          disabled
        >
          <Settings className="h-4 w-4" />
          <span className="hidden md:inline">Settings</span>
        </button>
      </nav>
    </aside>
  );
}
