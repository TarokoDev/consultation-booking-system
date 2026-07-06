import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type { Doctor } from "../api/types";
import { formatFullName } from "../utils/formatName";
import { CLINIC_CLOSED_DAYS, getOpeningDaysSummary } from "../utils/clinicHours";
import { formatShortDate } from "../utils/formatDateTime";

interface Props {
  doctor: Doctor;
  selectedDate: Date | null;
  onViewSlots: (date: Date) => void;
}

export function DateSelect({ doctor, selectedDate, onViewSlots }: Props) {
  const [date, setDate] = useState<Date | undefined>(selectedDate ?? undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">{formatFullName(doctor)}</h2>
        <div className="mt-2 space-y-1 text-sm text-gray-500">
          <p className="font-medium text-gray-600">Opening days</p>
          <ul className="space-y-0.5">
            {getOpeningDaysSummary().map(({ days, hours }) => (
              <li key={days}>
                <span className="text-gray-600">{days}:</span> {hours}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-gray-700">Select Date</label>
        <input
          type="text"
          readOnly
          value={date ? formatShortDate(date) : ""}
          placeholder="DD/MM/YY"
          onClick={() => setIsCalendarOpen((open) => !open)}
          className="input input-bordered w-full min-h-[44px] cursor-pointer"
        />
        {isCalendarOpen && (
          <div className="absolute z-10 mt-2 max-w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={(selected) => {
                setDate(selected);
                setIsCalendarOpen(false);
              }}
              disabled={{ before: new Date(), dayOfWeek: [...CLINIC_CLOSED_DAYS] }}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={!date}
          onClick={() => date && onViewSlots(date)}
          className="btn btn-primary min-h-[44px] w-full"
        >
          View Slots
        </button>
      </div>
    </div>
  );
}
