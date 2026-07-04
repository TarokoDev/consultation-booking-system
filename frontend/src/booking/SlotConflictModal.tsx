import type { Slot } from "../api/types";
import { formatSlotTime } from "./types";

interface Props {
  slot: Slot;
  onSelectAnotherSlot: () => void;
}

export function SlotConflictModal({ slot, onSelectAnotherSlot }: Props) {
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-sm">
        <p>
          Sorry, {formatSlotTime(slot.start_time)} slot is already booked. Please select another
          one.
        </p>
        <div className="modal-action">
          <button type="button" onClick={onSelectAnotherSlot} className="btn btn-primary min-h-[44px] w-full">
            Select another slot
          </button>
        </div>
      </div>
    </div>
  );
}
