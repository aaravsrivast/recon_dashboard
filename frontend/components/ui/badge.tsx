import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-xs border px-2 py-0.5 text-mono-sm font-data uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-raised text-text-secondary",
        success: "border-success/30 bg-success-muted text-success",
        warning: "border-warning/30 bg-warning-muted text-warning",
        danger: "border-danger/30 bg-danger-muted text-danger",
        accent: "border-accent/30 bg-accent-muted text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
