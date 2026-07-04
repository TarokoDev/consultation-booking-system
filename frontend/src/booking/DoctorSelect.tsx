import { useEffect, useState } from "react";
import { getDoctors } from "../api/client";
import type { Doctor } from "../api/types";
import { formatFullName } from "../utils/formatName";

interface Props {
  onSelect: (doctor: Doctor) => void;
}

export function DoctorSelect({ onSelect }: Props) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDoctors()
      .then(({ doctors }) => setDoctors(doctors))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading doctors...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <h2 className="text-lg font-semibold">Select your doctor</h2>
      <div className="space-y-2">
        {doctors.map((doctor) => (
          <label
            key={doctor.id}
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
          >
            <input
              type="radio"
              name="doctor"
              className="radio radio-primary shrink-0"
              onChange={() => onSelect(doctor)}
            />
            <span>
              <span className="block font-medium text-gray-900">{formatFullName(doctor)}</span>
              <span className="block text-sm text-gray-500">{doctor.specialty}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
