import { useEffect, useState } from "react";
import { getPastBookings } from "../api/client";
import type { BookingWithSlot } from "../api/types";
import { formatDate, formatTime } from "../utils/formatDateTime";

export const HistoryCard = ({ booking }: { booking: BookingWithSlot }) => {
  
  const doctorName = [
    booking.doctor_title,
    booking.doctor_first_name,
    booking.doctor_middle_name,
    booking.doctor_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="card bg-base-100 border border-gray-200 flex flex-row justify-between items-center">
      <div className="card-body flex flex-row justify-between items-center">
        <div>
          <h3 className="card-title">{doctorName}</h3>
          <p className="text-sm text-gray-500">{booking.doctor_specialty}</p>
          <p className="text-sm">
            {formatDate(booking.start_time)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
          </p>
        </div>
        <div className="justify-end">
          <span className={`badge badge-${booking.status === "completed" ? "success" : "error"} badge-sm`}>{booking.status}</span>
        </div> 
      </div>
    </div>
  );
}

export function HistoryTab() {
  const [bookings, setBookings] = useState<BookingWithSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPastBookings()
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;
  if (bookings.length === 0)
    return <div className="p-4 text-sm text-gray-500">No past bookings.</div>;

  return (
    <div className="flex flex-col gap-3 p-4">
      {bookings.map((b) => (
        <HistoryCard key={b.id} booking={b} />
      ))}
    </div>
  );
}
