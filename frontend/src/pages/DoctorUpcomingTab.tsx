import { useEffect, useState } from "react";
import { getDoctorUpcomingBookings, markBookingComplete } from "../api/client";
import type { DoctorBookingView } from "../api/types";
import { formatDate, formatSlotTime } from "../utils/formatDateTime";

function BookingCard({
  booking,
  onCompleted,
}: {
  booking: DoctorBookingView;
  onCompleted: (id: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canComplete = new Date(booking.start_time) <= new Date() && booking.status === "confirmed";

  const handleComplete = async () => {
    setLoading(true);
    try {
      await markBookingComplete(booking.id);
      onCompleted(booking.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const patientName = [
    booking.patient_title,
    booking.patient_first_name,
    booking.patient_middle_name,
    booking.patient_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="card bg-base-100 border border-gray-200 flex flex-row justify-between items-center">
      <div className="card-body">
        <h3 className="card-title">{patientName}</h3>
        <p className="text-sm">
          {formatDate(booking.start_time)} · {formatSlotTime(booking.start_time)}–{formatSlotTime(booking.end_time)}
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <div className="card-body">
        <button
          className="btn btn-success btn-sm"
          disabled={!canComplete || loading}
          onClick={handleComplete}
        >
          {loading ? "Saving…" : "Mark Complete"}
        </button>
      </div>
    </div>
  );
}

export function DoctorUpcomingTab() {
  const [bookings, setBookings] = useState<DoctorBookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDoctorUpcomingBookings()
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCompleted = (id: number) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) return <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500 text-center">{error}</div>;
  if (bookings.length === 0)
    return <div className="p-4 text-sm text-gray-500 text-center">No upcoming bookings.</div>;

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} onCompleted={handleCompleted} />
      ))}
    </div>
  );
}
