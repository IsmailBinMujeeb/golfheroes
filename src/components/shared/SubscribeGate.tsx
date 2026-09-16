import * as React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Non-subscribers keep the shape of the page and see a nudge rather than a hard
 * redirect wall — the restricted access § 04 asks for, without a dead end.
 */
export function LockedModule({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[3px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-900/60 px-4 text-center">
        <Lock className="size-4 text-amber-400" />
        <p className="text-sm text-cream-100">{label}</p>
      </div>
    </div>
  );
}

export function SubscribeBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border border-amber-500/40 bg-amber-500/5 px-5 py-4",
        className
      )}
    >
      <div>
        <p className="font-display text-base text-cream-100">Subscribe to unlock your dashboard</p>
        <p className="text-sm text-cream-300">
          Logging scores, entering the monthly draw and giving to your charity all start with a plan.
        </p>
      </div>
      <Button asChild variant="accent">
        <Link to="/subscribe">Choose a plan</Link>
      </Button>
    </div>
  );
}
