/**
 * A small group of choices, one of which is on: theme, accent, server mode.
 * Real radio inputs carry the state so arrow keys and screen readers work.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (next: T) => void;
}) {
  return (
    // `relative` holds the sr-only legend and inputs: with no positioned
    // ancestor they are placed against the document and stretch the page.
    <fieldset className="relative flex rounded-lg border border-hairline p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.id}
          className={`rounded-md ${disabled ? "opacity-40" : "cursor-pointer"}`}
        >
          <input
            type="radio"
            name={label}
            value={o.id}
            checked={value === o.id}
            disabled={disabled}
            onChange={() => onChange(o.id)}
            className="peer sr-only"
          />
          <span
            className={`block rounded-md px-2.5 py-1 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-accent ${
              value === o.id ? "bg-active font-medium" : "text-muted"
            }`}
          >
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
