import { useState } from "react";
import { toast } from "react-toastify";
import { ApiError, createBooking } from "../api/client";
import type { Doctor, Slot } from "../api/types";
import { DoctorSelect } from "./DoctorSelect";
import { DateSelect } from "./DateSelect";
import { SlotSelect } from "./SlotSelect";
import { SlotConflictModal } from "./SlotConflictModal";
import { BookingNotes } from "./BookingNotes";
import { ConfirmBooking } from "./ConfirmBooking";
import { BookingSuccess } from "./BookingSuccess";
import { BookingError } from "./BookingError";
import type { Step } from "./types";

const STEP_ORDER: Step[] = ["doctor-select", "date-select", "slot-select", "notes", "confirm-booking"];

export function BookingFlow() {
  const [step, setStep] = useState<Step>("doctor-select");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState("");
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step);
  const canGoBack = stepIndex > 0;

  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  function resetToStart() {
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setNotes("");
    setIsConflictModalOpen(false);
    setStep("doctor-select");
  }

  async function handleConfirm() {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    try {
      await createBooking(selectedSlot.id, notes);
      setStep("success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.message === "You already have a booking at this time") {
          toast.warning("You already have a booking at this time. Please select another slot.");
          setSelectedSlot(null);
          setStep("slot-select");
        } else {
          setIsConflictModalOpen(true);
        }
      } else {
        setStep("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      
        {canGoBack && (
          <div className="mx-auto flex w-full max-w-lg items-center p-4 pb-0">
          <button
            type="button"
            onClick={goBack}
            className="btn btn-ghost btn-sm min-h-[44px] px-2"
          >
            &larr; Go back
          </button>
          </div>
        )}

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
        />
      )}

      {step === "slot-select" && selectedDoctor && selectedDate && (
        <SlotSelect
          doctor={selectedDoctor}
          date={selectedDate}
          onSelectSlot={(slot) => {
            setSelectedSlot(slot);
            setStep("notes");
          }}
        />
      )}

      {step === "notes" && (
        <BookingNotes
          value={notes}
          onChange={setNotes}
          onContinue={() => setStep("confirm-booking")}
        />
      )}

      {step === "confirm-booking" && selectedDoctor && selectedDate && selectedSlot && (
        <>
          <ConfirmBooking
            doctor={selectedDoctor}
            date={selectedDate}
            slot={selectedSlot}
            notes={notes}
            isSubmitting={isSubmitting}
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
