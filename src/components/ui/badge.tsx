import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-line-600 text-cream-300",
        sage: "border-sage-500/50 bg-sage-500/10 text-sage-400",
        amber: "border-amber-500/50 bg-amber-500/10 text-amber-400",
        danger: "border-danger/50 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
