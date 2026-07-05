import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { getSlots, getBookedTimes } from "../api/client";
import type { Doctor, Slot } from "../api/types";
import { formatFullName } from "../utils/formatName";
import { formatLongDate, formatSlotTime, toDateParam } from "./types";

interface Props {
  doctor: Doctor;
  date: Date;
  onSelectSlot: (slot: Slot) => void;
}

function overlaps(
  slot: Slot,
  bookedTimes: { start_time: string; end_time: string }[]
) {
  const slotStart = new Date(slot.start_time).getTime();
  const slotEnd = new Date(slot.end_time).getTime();
  return bookedTimes.some((b) => {
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return slotStart < bEnd && slotEnd > bStart;
  });
}

export function SlotSelect({ doctor, date, onSelectSlot }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookedTimes, setBookedTimes] = useState<{ start_time: string; end_time: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSlots = useCallback(() => {
    setIsLoading(true);
    const dateParam = toDateParam(date);
    Promise.all([getSlots(doctor.id, dateParam), getBookedTimes(dateParam)])
      .then(([{ slots }, { bookedTimes }]) => {
        setSlots(slots);
        setBookedTimes(bookedTimes);
      })
      .finally(() => setIsLoading(false));
  }, [doctor.id, date]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <h2 className="text-lg font-semibold">
        {formatFullName(doctor)} - {formatLongDate(date)}
      </h2>

      {isLoading ? (
        <div className="p-4 text-sm text-gray-500">Loading slots...</div>
      ) : slots.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">No slots available for this date</p>
          <div className="space-y-2">
            <button type="button" onClick={fetchSlots} className="btn btn-primary min-h-[44px] w-full">
              View Slots
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => {
              const conflict = overlaps(slot, bookedTimes);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    if (conflict) {
                      toast.warning("You already have a booking at this time. Please select another slot.");
                    } else {
                      onSelectSlot(slot);
                    }
                  }}
                  className={`btn min-h-[44px] ${conflict ? "btn-outline opacity-40 cursor-not-allowed" : "btn-outline"}`}
                >
                  {formatSlotTime(slot.start_time)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
