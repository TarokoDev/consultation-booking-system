interface Props {
  onBookAnother: () => void;
}

export function BookingError({ onBookAnother }: Props) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 p-4 text-center">
      <p className="text-gray-700">Sorry, something went wrong. Please try booking again.</p>
      <button type="button" onClick={onBookAnother} className="btn btn-primary min-h-[44px] w-full">
        Book another consultation
      </button>
    </div>
  );
}
