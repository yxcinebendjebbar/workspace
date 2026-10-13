import { useState } from "react";

// First click arms the button ("Delete?"), second click deletes.
// Losing focus disarms it. Parent row should have the `group` class.
export function DeleteButton({
  label,
  onDelete,
  visible = false,
}: {
  label: string;
  onDelete: () => void;
  /** Set for surfaces like the modal, where the button is not in a row. */
  visible?: boolean;
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
      className={`shrink-0 rounded px-1.5 text-sm ${
        armed
          ? "bg-danger/10 text-danger opacity-100 hover:bg-danger/20"
          : `text-muted hover:bg-active hover:text-ink focus-visible:opacity-100 ${
              visible ? "opacity-100" : "group-hover:opacity-100"
            }`
      }`}
    >
      {armed ? "Delete?" : "×"}
    </button>
  );
}
