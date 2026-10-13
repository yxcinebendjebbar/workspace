import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A modal surface: white panel over a dimmed page. Escape and a click on the
 * backdrop close it, and Tab stays inside while it is open.
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

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
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
      {/* The backdrop is a real button so it is reachable and dismissable. */}
      <button
        type="button"
        aria-label="Close"
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
