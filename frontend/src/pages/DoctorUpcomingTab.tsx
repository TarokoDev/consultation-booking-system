import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { getDoctorUpcomingBookings, getDoctorBookedDates, markBookingComplete } from "../api/client";
import type { DoctorBookingView } from "../api/types";
import { formatSlotTime, formatDatePickerLabel } from "../utils/formatDateTime";

function toYMD(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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
          {formatSlotTime(booking.start_time)}–{formatSlotTime(booking.end_time)}
        </p>
        <p className="text-sm">Reason for visit: {booking.notes ? booking.notes : "N/A"}</p>
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
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [bookings, setBookings] = useState<DoctorBookingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch booked dates whenever visible month changes
  useEffect(() => {
    getDoctorBookedDates(toYearMonth(visibleMonth))
      .then((data) => setBookedDates(data.dates.map(fromYMD)))
      .catch(() => {}); // non-critical, green highlight just won't show
  }, [visibleMonth]);

  // Fetch bookings for selected date
  useEffect(() => {
    setLoading(true);
    setError(null);
    getDoctorUpcomingBookings(selectedDate)
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const handleDaySelect = (day: Date | undefined) => {
    if (day) setSelectedDate(toYMD(day));
    setCalendarOpen(false);
  };

  const handleCompleted = (id: number) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Upcoming Appointments</h2>
        <div className="relative flex items-center gap-2">
          <span className="text-sm text-gray-500">{formatDatePickerLabel(selectedDate)}</span>
          <button
            className="btn btn-sm btn-ghost px-2"
            onClick={() => setCalendarOpen((o) => !o)}
            aria-label="Pick a date"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {calendarOpen && (
            <div className="absolute right-0 top-8 z-10 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
<DayPicker
                mode="single"
                selected={fromYMD(selectedDate)}
                month={visibleMonth}
                onMonthChange={setVisibleMonth}
                onSelect={handleDaySelect}
                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                modifiers={{ hasBooking: bookedDates }}
                modifiersClassNames={{ hasBooking: "has-booking" }}
              />
            </div>
          )}
        </div>
      </div>

      {loading && <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>}
      {error && <div className="p-4 text-sm text-red-500 text-center">{error}</div>}
      {!loading && !error && bookings.length === 0 && (
        <div className="p-4 text-sm text-gray-500 text-center">No appointments for this day.</div>
      )}
      {!loading && !error && bookings.map((b) => (
        <BookingCard key={b.id} booking={b} onCompleted={handleCompleted} />
      ))}
    </div>
  );
}
