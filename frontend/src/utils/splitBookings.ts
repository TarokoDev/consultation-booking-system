import type { AdminUserBooking } from "../api/types";

export interface SplitBookings {
  upcoming: AdminUserBooking[];
  history: AdminUserBooking[];
}

// Splits a user's bookings (already sorted by start_time DESC from the API)
// into the two sections the admin detail view renders.
// "Upcoming" matches the patient tab's definition: confirmed AND in the
// future. A past booking still marked confirmed (a no-show) lands in
// History, where an admin would look for it.
export function splitBookings(bookings: AdminUserBooking[]): SplitBookings {
  const now = Date.now();
  const upcoming: AdminUserBooking[] = [];
  const history: AdminUserBooking[] = [];

  for (const b of bookings) {
    if (b.status === "confirmed" && new Date(b.start_time).getTime() > now) {
      upcoming.push(b);
    } else {
      history.push(b);
    }
  }

  // API returns newest-first (right for History); Upcoming reads soonest-first.
  upcoming.reverse();

  return { upcoming, history };
}
