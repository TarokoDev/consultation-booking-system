// "2026-07-06T08:30:00.000Z" → "Mon 06 Jul 2026"
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// "2026-07-06T08:30:00.000Z" → "08:30 AM"
export function formatSlotTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// new Date("2026-07-06") → "06 July 2026"
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

// new Date("2026-07-06") → "06/07/26"
export function formatShortDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
