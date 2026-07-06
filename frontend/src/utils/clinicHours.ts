function formatClinicTime(hour: number, minute = 0): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const WEEKDAY_HOURS = `${formatClinicTime(8)} – ${formatClinicTime(13, 0)}, ${formatClinicTime(14, 0)} – ${formatClinicTime(17, 0)}`;
const SATURDAY_HOURS = `${formatClinicTime(8)} – ${formatClinicTime(13, 0)}`;

export const CLINIC_CLOSED_DAYS = [0] as const; // Sunday

/** General opening schedule for the date-picker step. */
export function getOpeningDaysSummary(): { days: string; hours: string }[] {
  return [
    { days: "Mon – Fri", hours: WEEKDAY_HOURS },
    { days: "Sat", hours: SATURDAY_HOURS },
    { days: "Sun", hours: "Closed" },
  ];
}

/** Opening hours for the selected date (matches backend seed SHIFTS). */
export function getOpeningHoursLabel(date: Date): string {
  const day = date.getDay(); // 0 = Sun, 6 = Sat

  if (day === 0) {
    return "Closed on Sundays";
  }

  if (day === 6) {
    return `Opening hours: ${SATURDAY_HOURS}`;
  }

  return `Opening hours: ${WEEKDAY_HOURS}`;
}
