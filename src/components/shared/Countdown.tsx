import * as React from "react";
import { countdown } from "@/lib/format";

export function Countdown({ to, className }: { to: string; className?: string }) {
  const [label, setLabel] = React.useState(() => countdown(to));

  React.useEffect(() => {
    const id = window.setInterval(() => setLabel(countdown(to)), 30_000);
    return () => window.clearInterval(id);
  }, [to]);

  return (
    <span className={className}>
      <span className="tnum">{label}</span>
    </span>
  );
}
