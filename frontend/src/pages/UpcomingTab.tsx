import { useEffect, useState } from "react";
import { getUpcomingBookings, cancelBooking } from "../api/client";
import type { BookingWithSlot } from "../api/types";
import { formatDate, formatTime } from "../utils/formatDateTime";

function ConfirmationModal({
  show,
  onClose,
  onConfirm,
}: {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={`modal ${show ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="text-lg font-bold">Confirm Cancellation</h3>
        <p>Are you sure you want to cancel this booking?</p>
        <div className="modal-action">
          <button className="btn btn-error" onClick={onConfirm}>
            Confirm
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onCancelled,
}: {
  booking: BookingWithSlot;
  onCancelled: (id: number) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      await cancelBooking(booking.id);
      onCancelled(booking.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  const doctorName = [
    booking.doctor_title,
    booking.doctor_first_name,
    booking.doctor_middle_name,
    booking.doctor_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <ConfirmationModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
      />
      <div className="card bg-base-100 border border-gray-200 flex flex-row justify-between items-center">
        <div className="card-body">
          <h3 className="card-title">{doctorName}</h3>
          <p className="text-sm text-gray-500">{booking.doctor_specialty}</p>
          <p className="text-sm">
            {formatDate(booking.start_time)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="card-body">
          {booking.status === "confirmed" && (
            <button
              className="btn btn-error btn-sm"
              disabled={loading}
              onClick={() => setShowModal(true)}
            >
              {loading ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </>
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

  const handleCancelled = (id: number) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;
  if (bookings.length === 0)
    return <div className="p-4 text-sm text-gray-500">No upcoming bookings.</div>;

  return (
    <div className="flex flex-col gap-3 p-4">
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} onCancelled={handleCancelled} />
      ))}
    </div>
  );
}
