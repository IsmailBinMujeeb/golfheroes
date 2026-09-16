import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The one deliberate motion moment in the product: winning numbers land one at
 * a time. Reduced-motion users get the same numbers, instantly.
 */
export function DrawNumbers({
  numbers,
  matched = [],
  reveal = false,
  size = "md",
}: {
  numbers: number[];
  matched?: number[];
  reveal?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [shown, setShown] = React.useState(reveal ? 0 : numbers.length);

  React.useEffect(() => {
    if (!reveal) {
      setShown(numbers.length);
      return;
    }
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setShown(numbers.length);
      return;
    }
    setShown(0);
    const timers = numbers.map((_, i) =>
      window.setTimeout(() => setShown((n) => Math.max(n, i + 1)), 320 * (i + 1))
    );
    return () => timers.forEach(window.clearTimeout);
  }, [numbers, reveal]);

  const box =
    size === "lg" ? "size-14 text-xl" : size === "sm" ? "size-8 text-xs" : "size-11 text-base";

  return (
    <ul className="flex flex-wrap gap-2">
      {numbers.map((n, i) => (
        <li
          key={`${n}-${i}`}
          className={cn(
            "tnum flex items-center justify-center border font-medium",
            box,
            i < shown ? "opacity-100" : "opacity-0",
            i < shown && reveal && "animate-number-land",
            matched.includes(n)
              ? "border-sage-500 bg-sage-500/15 text-sage-400"
              : "border-line-600 text-cream-100"
          )}
        >
          {n}
        </li>
      ))}
    </ul>
  );
}
