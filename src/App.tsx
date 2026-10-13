import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { applyAppearance, watchSystemTheme } from "./lib/appearance";
import { useStore } from "./store";
import { DailyView } from "./views/DailyView";
import { IssuesView } from "./views/IssuesView";
import { SettingsView } from "./views/SettingsView";
import { TodosView } from "./views/TodosView";

export default function App() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);
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
          {ready && view?.type === "daily" && <DailyView />}
          {ready && view?.type === "issues" && <IssuesView />}
          {ready && view?.type === "todos" && <TodosView />}
          {ready && view?.type === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
