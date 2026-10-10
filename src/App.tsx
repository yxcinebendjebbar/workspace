import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "./components/Sidebar";
import { useStore } from "./store";
import { IssuesView } from "./views/IssuesView";
import { TodosView } from "./views/TodosView";

export default function App() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);
  const refresh = useStore((s) => s.refresh);

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

  if (!ready) return null;

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {view?.type === "issues" && <IssuesView />}
        {view?.type === "todos" && <TodosView />}
      </main>
    </div>
  );
}
