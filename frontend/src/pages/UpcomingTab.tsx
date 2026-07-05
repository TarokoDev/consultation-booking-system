import { useEffect, useState } from "react";
import { getUpcomingBookings } from "../api/client";
import type { BookingWithSlot } from "../api/types";
import { formatDate, formatTime } from "../utils/formatDateTime";

function renderBookingCard(booking: BookingWithSlot) {
  return (
    <div key={booking.id} className="card bg-base-100 shadow-sm flex flex-row justify-between items-center">
      <div className="card-body">
        <h3 className="card-title">{booking.doctor_title} {booking.doctor_first_name} {booking.doctor_middle_name} {booking.doctor_last_name}</h3>
        <h4 className="card-subtitle">{booking.doctor_specialty}</h4>
        <p className="card-text">{formatDate(booking.start_time)} - {formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
      </div>
      <div className="card-body card-actions justify-end flex flex-row gap-2">
        {booking.status === 'confirmed' && <button className="btn btn-error btn-sm">Cancel</button>}
      </div>
    </div>
  );
}

export function UpcomingTab() {
  const [bookings, setBookings] = useState<BookingWithSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUpcomingBookings()
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;
  if (bookings.length === 0)
    return <div className="p-4 text-sm text-gray-500">No upcoming bookings.</div>;

  return (
    <div className="flex flex-col gap-3 p-4">
      {bookings.map((b) => renderBookingCard(b))}
    </div>
  );
}
