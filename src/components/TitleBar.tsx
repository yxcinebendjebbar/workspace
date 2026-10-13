import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

/**
 * Window chrome. The bar drags the window; only the three buttons do anything,
 * and closing keeps Keel running in the tray (unless Settings turned that off,
 * in which case Rust ends the process instead).
 */
export function TitleBar() {
  const maximized = useMaximized();

  return (
    <header
      data-tauri-drag-region
      className="flex h-9 shrink-0 items-stretch border-b border-hairline bg-ground"
    >
      <div
        data-tauri-drag-region
        className="flex flex-1 items-center pl-3 text-xs text-muted"
      >
        Keel
      </div>
      <ControlButton
        label="Minimize"
        onClick={() => void getCurrentWindow().minimize()}
      >
        <svg viewBox="0 0 10 10" className="size-3.5" aria-hidden="true">
          <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </ControlButton>
      <ControlButton
        label={maximized ? "Restore" : "Maximize"}
        onClick={() => void getCurrentWindow().toggleMaximize()}
      >
        {maximized ? (
          <svg viewBox="0 0 10 10" className="size-3.5" aria-hidden="true">
            <path
              d="M2.5 2.5H7.5V7.5H2.5Z M0.5 2.5V8H6"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 10 10" className="size-3.5" aria-hidden="true">
            <path
              d="M0.5 0.5H9.5V9.5H0.5Z"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        )}
      </ControlButton>
      <ControlButton
        label="Close"
        close
        // Rust swaps this for a hide when the close-to-tray setting is on.
        onClick={() => void getCurrentWindow().close()}
      >
        <svg viewBox="0 0 10 10" className="size-3.5" aria-hidden="true">
          <path
            d="M0.5 0.5L9.5 9.5 M9.5 0.5L0.5 9.5"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </ControlButton>
    </header>
  );
}

/** Maximize state comes from the window, so the icon can never drift. */
function useMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    let alive = true;
    void win.isMaximized().then((m) => {
      if (alive) setMaximized(m);
    });
    // Resizing is the only signal the OS gives us; the icon just tracks it.
    const unlisten = win.onResized(async () => {
      if (alive) setMaximized(await win.isMaximized());
    });
    return () => {
      alive = false;
      void unlisten.then((fn) => fn());
    };
  }, []);

  return maximized;
}

function ControlButton({
  label,
  close = false,
  onClick,
  children,
}: {
  label: string;
  close?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex w-11 items-center justify-center text-muted transition-colors ${
        close ? "hover:bg-danger hover:text-surface" : "hover:bg-hover"
      }`}
    >
      {children}
    </button>
  );
}
