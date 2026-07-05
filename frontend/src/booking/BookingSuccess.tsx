import type { Doctor } from "../api/types";
import { formatFullName } from "../utils/formatName";
import { formatLongDate } from "../utils/formatDateTime";

interface Props {
  doctor: Doctor;
  date: Date;
  onBookAnother: () => void;
}

export function BookingSuccess({ doctor, date, onBookAnother }: Props) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4 text-center">
      <div className="text-5xl text-success">&#10003;</div>
      <h2 className="text-lg font-semibold">Booking confirmed</h2>
      <p className="text-gray-600">
        {formatFullName(doctor)} - {formatLongDate(date)}
      </p>
      <button type="button" onClick={onBookAnother} className="btn btn-primary min-h-[44px] w-full">
        Book another consultation
      </button>
    </div>
  );
}
