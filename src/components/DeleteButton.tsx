import { useState } from "react";

// First click arms the button ("Delete?"), second click deletes.
// Losing focus disarms it. Parent row should have the `group` class.
export function DeleteButton({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <button
      type="button"
      aria-label={armed ? `Confirm delete ${label}` : `Delete ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        if (armed) onDelete();
        else setArmed(true);
      }}
      onBlur={() => setArmed(false)}
      className={`shrink-0 rounded px-1.5 text-sm text-stone-500 hover:bg-stone-200 hover:text-stone-900 focus-visible:opacity-100 group-hover:opacity-100 ${
        armed ? "bg-red-50 text-red-700 opacity-100 hover:bg-red-100 hover:text-red-800" : "opacity-0"
      }`}
    >
      {armed ? "Delete?" : "×"}
    </button>
  );
}
