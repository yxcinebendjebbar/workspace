/**
 * A switch for settings. The on state is ink, not accent: the accent stays
 * reserved for status, focus and links.
 */
export function Toggle({
  checked,
  label,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  label: string;
  /** For settings that arrive in a later phase. */
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        checked ? "bg-ink" : "bg-active"
      }`}
    >
      <span
        className={`absolute top-1 left-1 size-4 rounded-full bg-surface transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
