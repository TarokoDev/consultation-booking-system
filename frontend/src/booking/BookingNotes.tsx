interface Props {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

export function BookingNotes({ value, onChange, onContinue }: Props) {
  const isValid = value.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <h2 className="text-lg font-semibold">What brings you in?</h2>
      <p className="text-sm text-gray-600">
        Tell us what you're feeling and the reason for your visit.
      </p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="E.g. persistent cough for the past week, mild fever..."
        className="textarea textarea-bordered w-full"
      />

      <button
        type="button"
        onClick={onContinue}
        disabled={!isValid}
        className="btn btn-primary min-h-[44px] w-full"
      >
        Continue
      </button>
    </div>
  );
}
