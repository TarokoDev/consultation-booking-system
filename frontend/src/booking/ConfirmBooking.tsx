import type { Doctor, Slot } from "../api/types";
import { formatFullName } from "../utils/formatName";
import { formatLongDate, formatSlotTime } from "../utils/formatDateTime";

interface Props {
  doctor: Doctor;
  date: Date;
  slot: Slot;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmBooking({
  doctor,
  date,
  slot,
  isSubmitting,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <h2 className="text-lg font-semibold">Confirm Booking?</h2>

      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <span>Doctor: {formatFullName(doctor)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Date: {formatLongDate(date)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Slot: {formatSlotTime(slot.start_time)} - {formatSlotTime(slot.end_time)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn btn-error btn-outline min-h-[44px] flex-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="btn btn-primary min-h-[44px] flex-1"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
