import { type KeyboardEvent, useEffect, useRef, useState } from "react";

// Text that edits in place: Enter saves, Escape cancels and restores the
// original. Losing focus saves, so a stray click does not lose the edit.
export function InlineEdit({
  value,
  label,
  onSave,
  className = "",
}: {
  value: string;
  label: string;
  onSave: (next: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // The editor is only mounted while editing, so focusing on mount is enough.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    else setDraft(value);
  };

  const cancel = () => {
    setDraft(value);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") inputRef.current?.blur();
    else if (e.key === "Escape") cancel();
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label={label}
      className={`w-full min-w-0 rounded border border-hairline bg-surface px-1.5 py-0.5 text-sm ${className}`}
    />
  );
}
