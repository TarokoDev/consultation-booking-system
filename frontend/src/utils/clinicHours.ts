function formatClinicTime(hour: number, minute = 0): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Opening hours for the selected date (matches backend seed SHIFTS). */
export function getOpeningHoursLabel(date: Date): string {
  const day = date.getDay(); // 0 = Sun, 6 = Sat

  if (day === 0) {
    return "Closed on Sundays";
  }

  const morningEnd = formatClinicTime(13, 0);

  if (day === 6) {
    return `Opening hours: ${formatClinicTime(8)} – ${morningEnd}`;
  }

  const afternoonStart = formatClinicTime(14, 0);
  const afternoonEnd = formatClinicTime(17, 0);
  return `Opening hours: ${formatClinicTime(8)} – ${morningEnd}, ${afternoonStart} – ${afternoonEnd}`;
}
