import { listen } from "@tauri-apps/api/event";
import { lazy, Suspense, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { applyAppearance, watchSystemTheme } from "./lib/appearance";
import { useStore } from "./store";
import { DailyView } from "./views/DailyView";
import { IssuesView } from "./views/IssuesView";
import { TodosView } from "./views/TodosView";

/**
 * Settings pulls in the backup parser and the dialog, filesystem and autostart
 * plugins; Sessions pulls in the opencode bridge. Nothing else needs either,
 * so they load on open instead of at startup.
 */
const SettingsView = lazy(() =>
  import("./views/SettingsView").then((m) => ({ default: m.SettingsView })),
);
const SessionsView = lazy(() =>
  import("./views/SessionsView").then((m) => ({ default: m.SessionsView })),
);

export default function App() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);
  const initError = useStore((s) => s.initError);
  const refresh = useStore((s) => s.refresh);
  const theme = useStore((s) => s.settings.theme);
  const accent = useStore((s) => s.settings.accent);

  useEffect(() => {
    void init();
  }, [init]);

  // The launcher is a separate webview, so its writes show up here as events.
  useEffect(() => {
    const unlisten = listen("data-changed", () => void refresh());
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [refresh]);

  // "System" keeps following the OS; the other two are already applied.
  useEffect(() => {
    if (theme !== "system") return;
    return watchSystemTheme(() => applyAppearance(theme, accent));
  }, [theme, accent]);

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-surface">
          {initError && (
            <p
              role="alert"
              className="mx-auto max-w-3xl border-b border-hairline px-8 py-4 text-sm text-danger"
            >
              {initError}
            </p>
          )}
          {ready && view?.type === "daily" && <DailyView />}
          {ready && view?.type === "issues" && <IssuesView />}
          {ready && view?.type === "todos" && <TodosView />}
          {ready && view?.type === "sessions" && (
            <Suspense fallback={null}>
              <SessionsView />
            </Suspense>
          )}
          {ready && view?.type === "settings" && (
            <Suspense fallback={null}>
              <SettingsView />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
