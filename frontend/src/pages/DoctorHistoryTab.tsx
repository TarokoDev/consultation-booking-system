import { useEffect, useState } from "react";
import { getDoctorPastBookings } from "../api/client";
import type { DoctorBookingView } from "../api/types";
import { formatDate, formatSlotTime } from "../utils/formatDateTime";

function HistoryCard({ booking }: { booking: DoctorBookingView }) {
  const patientName = [
    booking.patient_title,
    booking.patient_first_name,
    booking.patient_middle_name,
    booking.patient_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="card bg-base-100 border border-gray-200">
      <div className="card-body flex flex-row justify-between items-center">
        <div>
          <h3 className="card-title">{patientName}</h3>
          <p className="text-sm">
            {formatDate(booking.start_time)} · {formatSlotTime(booking.start_time)}–{formatSlotTime(booking.end_time)}
          </p>
          <p className="text-sm">Reason for visit: {booking.notes ? booking.notes : "N/A"}</p>
        </div>
        <span className={`badge badge-sm ${booking.status === "completed" ? "badge-success" : "badge-error"}`}>
          {booking.status}
        </span>
      </div>
    </div>
  );
}

export function DoctorHistoryTab() {
  const [bookings, setBookings] = useState<DoctorBookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDoctorPastBookings()
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500 text-center">{error}</div>;
  if (bookings.length === 0)
    return <div className="p-4 text-sm text-gray-500 text-center">No past bookings.</div>;

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => (
        <HistoryCard key={b.id} booking={b} />
      ))}
    </div>
  );
}
