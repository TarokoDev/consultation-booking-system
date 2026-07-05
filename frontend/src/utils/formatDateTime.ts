// For flexibility maybe have 2 functions, formatDate and formatTime.

// Example: 2026-07-06T00:00:00.000Z to "Wed 8 July 2026"
export function formatDate(dateTime: string) {
  return new Date(dateTime).toLocaleDateString('en-SG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Example: 2026-07-06T00:00:00.000Z to "10.00 AM - 10.30 AM"
export function formatTime(dateTime: string) {
  return new Date(dateTime).toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}