import { useState } from "react";
import { ApiError, createBooking } from "../api/client";
import type { Doctor, Slot } from "../api/types";
import { DoctorSelect } from "./DoctorSelect";
import { DateSelect } from "./DateSelect";
import { SlotSelect } from "./SlotSelect";
import { SlotConflictModal } from "./SlotConflictModal";
import { ConfirmBooking } from "./ConfirmBooking";
import { BookingSuccess } from "./BookingSuccess";
import { BookingError } from "./BookingError";
import type { Step } from "./types";

export function BookingFlow() {
  const [step, setStep] = useState<Step>("doctor-select");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetToStart() {
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setIsConflictModalOpen(false);
    setStep("doctor-select");
  }

  async function handleConfirm() {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    try {
      await createBooking(selectedSlot.id);
      setStep("success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setIsConflictModalOpen(true);
      } else {
        setStep("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {step === "doctor-select" && (
        <DoctorSelect
          onSelect={(doctor) => {
            setSelectedDoctor(doctor);
            setStep("date-select");
          }}
        />
      )}

      {step === "date-select" && selectedDoctor && (
        <DateSelect
          doctor={selectedDoctor}
          selectedDate={selectedDate}
          onViewSlots={(date) => {
            setSelectedDate(date);
            setStep("slot-select");
          }}
          onBackToDoctors={() => setStep("doctor-select")}
        />
      )}

      {step === "slot-select" && selectedDoctor && selectedDate && (
        <SlotSelect
          doctor={selectedDoctor}
          date={selectedDate}
          onSelectSlot={(slot) => {
            setSelectedSlot(slot);
            setStep("confirm-booking");
          }}
          onBackToDates={() => setStep("date-select")}
          onBackToDoctors={() => setStep("doctor-select")}
        />
      )}

      {step === "confirm-booking" && selectedDoctor && selectedDate && selectedSlot && (
        <>
          <ConfirmBooking
            doctor={selectedDoctor}
            date={selectedDate}
            slot={selectedSlot}
            isSubmitting={isSubmitting}
            onEditDoctor={() => setStep("doctor-select")}
            onEditDate={() => setStep("date-select")}
            onEditSlot={() => setStep("slot-select")}
            onCancel={resetToStart}
            onConfirm={handleConfirm}
          />
          {isConflictModalOpen && (
            <SlotConflictModal
              slot={selectedSlot}
              onSelectAnotherSlot={() => {
                setIsConflictModalOpen(false);
                setSelectedSlot(null);
                setStep("slot-select");
              }}
            />
          )}
        </>
      )}

      {step === "success" && selectedDoctor && selectedDate && (
        <BookingSuccess doctor={selectedDoctor} date={selectedDate} onBookAnother={resetToStart} />
      )}

      {step === "error" && <BookingError onBookAnother={resetToStart} />}
    </div>
  );
}
