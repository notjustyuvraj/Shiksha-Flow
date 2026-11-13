export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateLabel(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return d;
  }
}

export function inr(n: number): string {
  return n.toLocaleString("en-IN");
}

// Teach-Time Reclaim estimate constants (illustrative, transparent).
export const MIN_PER_ATTENDANCE_DAY = 5;
export const MIN_PER_MEAL_DAY = 3;

export function formatMinutes(mins: number): string {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
