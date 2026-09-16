const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Amounts are stored in paise everywhere so no float rounding creeps into the pool maths. */
export function formatPaise(paise: number) {
  return inr.format(Math.round(paise) / 100);
}

export function formatRupees(rupees: number) {
  return inr.format(rupees);
}

export function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonth(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** "3d 4h" style countdown used on the dashboard and draw pages. */
export function countdown(to: string | Date) {
  const target = typeof to === "string" ? new Date(to) : to;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Drawing now";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
