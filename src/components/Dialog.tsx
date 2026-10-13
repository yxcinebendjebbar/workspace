import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A modal surface: a `surface` panel over a dimmed page. Escape and a click on
 * the backdrop close it, and Tab stays inside while it is open.
 */
export function Dialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus runs once on open. Re-running it on every parent render would pull
  // focus back to the first field while the user is typing in a later one.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const keepTabInside = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (panel && !panel.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Pointer-only close target: Escape covers the keyboard, and Tab must
          not be able to reach past the panel into the backdrop. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-ink/30"
      />
      <div className="relative flex min-h-full items-start justify-center p-6 pt-[10vh]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          onKeyDown={keepTabInside}
          className="w-full max-w-xl rounded-xl border border-hairline bg-surface p-6 shadow-lg outline-none"
        >
          <h2 className="mb-4 text-base font-semibold">{title}</h2>
          {children}
          {footer && (
            <div className="mt-6 flex justify-end gap-2">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
