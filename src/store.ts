import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { create } from "zustand";
import * as q from "./db/queries";
import type { Issue, Project, Todo, TodoList } from "./db/schema";
import { applyAppearance } from "./lib/appearance";
import { parseBackup } from "./lib/backup";
import { errorMessage } from "./lib/errors";
import {
  DEFAULT_SETTINGS,
  getSettings,
  type Settings,
  saveSetting,
} from "./lib/settings";
import { opencode } from "./opencode/client";
import { onSessionFinished, reportFinished, watch } from "./opencode/events";
import { type OpenCodeSession, toSession } from "./opencode/sessions";

export type View =
  | { type: "daily" }
  | { type: "issues"; projectId: string }
  | { type: "todos"; listId: string }
  | { type: "sessions" }
  | { type: "settings" };

export type IssuePatch = Partial<
  Pick<Issue, "title" | "description" | "status" | "priority">
>;

/** What a Data row reports, so its message can sit beside the button. */
export type DataResult = { ok: true } | { ok: false; message: string };

/** An export holds the text to write; a failure holds the reason instead. */
export type ExportResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

interface Store {
  ready: boolean;
  view: View | null;
  settings: Settings;
  projects: Project[];
  lists: TodoList[];
  issues: Issue[];
  todos: Todo[];
  dailyTodos: Todo[];
  dailyIssues: q.ProjectIssue[];
  /** What opencode has run, newest first. */
  sessions: OpenCodeSession[];
  /** True once a session read has reached opencode. */
  opencodeConnected: boolean;
  /** The version the CLI reported; empty for a server Keel was pointed at. */
  opencodeVersion: string;
  /** Why talking to opencode failed, in one line. */
  opencodeError: string | null;
  /** Set when startup could not finish. The shell still renders so it is readable. */
  initError: string | null;
  /** The last read or write that failed, in one plain line. */
  actionError: string | null;

  init: () => Promise<void>;
  open: (view: View) => Promise<void>;
  /** Reloads lists and the open view, e.g. after the launcher wrote something. */
  refresh: () => Promise<void>;
  /** Connects to opencode and follows its sessions. Safe to call again. */
  watchOpenCode: () => Promise<void>;
  /** Rereads the session list from opencode. */
  reloadSessions: () => Promise<void>;
  setSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => Promise<void>;

  /** The text an export file should hold, or why the data could not be read. */
  exportBackup: () => Promise<ExportResult>;
  /** Adds what a backup file holds; a bad file comes back as a message. */
  importBackup: (text: string) => Promise<DataResult>;
  /** Empties the workspace and returns to the Daily view. */
  resetWorkspace: () => Promise<DataResult>;

  addProject: (name: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  addIssue: (title: string) => Promise<void>;
  patchIssue: (id: string, patch: IssuePatch) => Promise<void>;
  removeIssue: (id: string) => Promise<void>;

  addList: (name: string) => Promise<void>;
  renameList: (id: string, name: string) => Promise<void>;
  removeList: (id: string) => Promise<void>;

  addTodo: (listId: string, title: string) => Promise<void>;
  setTodoDone: (id: string, done: boolean) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
}

/** Asks Rust for the shortcut it actually got, which may be the fallback. */
const registerShortcut = (key: string) =>
  invoke<string>("set_launcher_shortcut", { key });

const setCloseToTray = (closeToTray: boolean) =>
  invoke("set_close_to_tray", { closeToTray });

/** How many sessions a window keeps: enough to see what just ran. */
const SESSION_LIMIT = 20;
/** opencode can announce the end of one turn with more than one event. */
const RELOAD_DEBOUNCE_MS = 250;

export const useStore = create<Store>((set, get) => {
  let stopWatching: (() => void) | null = null;
  let watchedClient: unknown = null;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;

  /** Session events arrive in bursts, so a reload waits for a quiet moment. */
  const scheduleReload = () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(
      () => void get().reloadSessions(),
      RELOAD_DEBOUNCE_MS,
    );
  };

  const reloadIssues = async () => {
    const v = get().view;
    if (v?.type === "issues") set({ issues: await q.listIssues(v.projectId) });
  };
  const reloadDaily = async () => {
    if (get().view?.type !== "daily") return;
    const [dailyTodos, dailyIssues] = await Promise.all([
      q.listOpenTodos(q.INBOX_ID),
      q.listInProgressIssues(),
    ]);
    set({ dailyTodos, dailyIssues });
  };
  const reloadCurrent = async () => {
    const v = get().view;
    if (v?.type === "todos") set({ todos: await q.listTodos(v.listId) });
    else if (v?.type === "issues")
      set({ issues: await q.listIssues(v.projectId) });
    else if (v?.type === "daily") await reloadDaily();
  };

  /** Stores a setting and runs whatever it changes right away. */
  const applySetting = async <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    if (key === "theme" || key === "accent") {
      const { theme, accent } = get().settings;
      applyAppearance(theme, accent);
      return;
    }
    if (key === "launcherShortcut") {
      const effective = await registerShortcut(String(value));
      // Another app may own the key, so Rust tells us what it got instead.
      if (effective !== value) {
        await saveSetting("launcherShortcut", effective);
        set({ settings: { ...get().settings, launcherShortcut: effective } });
      }
      return;
    }
    if (key === "closeToTray") await setCloseToTray(Boolean(value));
  };

  /** Shows a failure in the shell. The newest message replaces the old one. */
  const fail = (what: string, error: unknown) =>
    set({ actionError: `Keel could not ${what} (${errorMessage(error)}).` });

  /**
   * Runs a write. A failure stays on screen: the view has already changed, so
   * the message is the only thing telling the user the change did not stick.
   */
  const write = async (what: string, work: () => Promise<void>) => {
    try {
      await work();
      if (get().actionError) set({ actionError: null });
    } catch (error) {
      fail(what, error);
    }
  };

  /** Runs a read, which can fail without anything needing to be undone. */
  const read = async (what: string, work: () => Promise<void>) => {
    try {
      await work();
    } catch (error) {
      fail(what, error);
    }
  };

  return {
    ready: false,
    view: null,
    settings: DEFAULT_SETTINGS,
    projects: [],
    lists: [],
    issues: [],
    todos: [],
    dailyTodos: [],
    dailyIssues: [],
    sessions: [],
    opencodeConnected: false,
    opencodeVersion: "",
    opencodeError: null,
    initError: null,
    actionError: null,

    init: async () => {
      // Everything below can fail. Show the window first, because a hidden
      // window cannot tell anyone why it is not there.
      let problem: string | null = null;
      let settings = DEFAULT_SETTINGS;
      try {
        settings = await getSettings();
      } catch (error) {
        problem = `Keel could not read its settings (${errorMessage(error)}), so it is using the defaults.`;
      }
      set({ settings });
      applyAppearance(settings.theme, settings.accent);
      if (!settings.startMinimized) {
        const win = getCurrentWindow();
        await win.show();
        await win.setFocus();
      }

      try {
        // Rust registered the default shortcut before these webviews existed,
        // so the saved ones are pushed across now that we can read them.
        await applySetting("launcherShortcut", settings.launcherShortcut);
        await applySetting("closeToTray", settings.closeToTray);
        const [projects, lists] = await Promise.all([
          q.listProjects(),
          q.listTodoLists(),
        ]);
        set({ projects, lists, ready: true });
        await get().open({ type: "daily" });
      } catch (error) {
        problem = problem
          ? `${problem} It also could not load your workspace (${errorMessage(error)}).`
          : `Keel could not load your workspace (${errorMessage(error)}). Restart it; if it keeps failing, open Settings and look at the logs.`;
        // The shell still renders, so the message has somewhere to appear.
        set({ ready: true });
      }
      if (problem) set({ initError: problem });
    },

    open: async (view) => {
      set({ view });
      await read("read that view", reloadCurrent);
    },

    // The launcher writes through its own connection, so the main window
    // reloads when it hears data-changed.
    refresh: async () => {
      await read("load your workspace", async () => {
        const [lists, projects] = await Promise.all([
          q.listTodoLists(),
          q.listProjects(),
        ]);
        set({ lists, projects });
        const v = get().view;
        // A list or project deleted elsewhere must not leave a dead view.
        const gone =
          (v?.type === "issues" &&
            !projects.some((p) => p.id === v.projectId)) ||
          (v?.type === "todos" && !lists.some((l) => l.id === v.listId));
        if (gone) {
          await get().open({ type: "daily" });
          return;
        }
        await reloadCurrent();
        // Only a window already talking to opencode rereads its sessions, so
        // this never starts the service by itself.
        if (get().opencodeConnected) await get().reloadSessions();
      });
    },

    watchOpenCode: async () => {
      const url = get().settings.opencodeServerUrl;
      const result = await opencode(url);
      if (!result.ok) {
        set({ opencodeError: result.message, opencodeConnected: false });
        return;
      }
      set({
        opencodeConnected: true,
        opencodeVersion: result.version,
        opencodeError: null,
      });

      // A different client means a different server, so the old stream is
      // listening to the wrong one.
      if (watchedClient !== result.client) {
        stopWatching?.();
        watchedClient = result.client;
        stopWatching = watch(result.client, (signal) => {
          if (signal.kind === "finished") {
            // Only a session this window watched run is news; opencode reports
            // one finish more than once, and the second report finds it done.
            const running = get().sessions.find(
              (s) => s.id === signal.sessionId && s.status === "running",
            );
            if (running) {
              reportFinished({
                ...running,
                status: "finished",
                finished: running.finished ?? Date.now(),
              });
            }
          }
          scheduleReload();
        });
      }

      await get().reloadSessions();
    },

    reloadSessions: async () => {
      const result = await opencode(get().settings.opencodeServerUrl);
      if (!result.ok) {
        set({ opencodeError: result.message, opencodeConnected: false });
        return;
      }
      const directory = get().settings.opencodeDirectory;
      try {
        const [listed, active] = await Promise.all([
          result.client.session.list({
            limit: SESSION_LIMIT,
            order: "desc",
            ...(directory ? { directory } : {}),
          }),
          result.client.session.active(),
        ]);
        const running = new Set(Object.keys(active));
        set({
          sessions: listed.data.map((info) =>
            toSession(info, running.has(info.id)),
          ),
          opencodeConnected: true,
          opencodeError: null,
        });
      } catch (error) {
        set({
          opencodeError: `Keel could not read sessions from opencode (${errorMessage(error)}).`,
          opencodeConnected: false,
        });
      }
    },

    setSetting: async (key, value) => {
      const settings = { ...get().settings };
      settings[key] = value;
      set({ settings });
      await write("save that setting", async () => {
        await saveSetting(key, value);
        await applySetting(key, value);
      });
    },

    // Buttons in Settings run these, so each answers the row that ran it
    // instead of using the one failure line: the message belongs next to the
    // button, and a file that is not a backup is an expected answer, not a
    // fault. The data work itself stays here, not in the view.
    exportBackup: async () => {
      try {
        const data = await q.exportData();
        return { ok: true, text: JSON.stringify(data, null, 2) };
      } catch (error) {
        return {
          ok: false,
          message: `Could not read your data (${errorMessage(error)}).`,
        };
      }
    },

    importBackup: async (text) => {
      const parsed = parseBackup(text);
      if (!parsed.ok) return parsed;
      try {
        await q.importData(parsed.data);
        await get().refresh();
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message: `Could not import that file (${errorMessage(error)}).`,
        };
      }
    },

    resetWorkspace: async () => {
      try {
        await q.resetAllData();
        await get().refresh();
        await get().open({ type: "daily" });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message: `Could not reset your data (${errorMessage(error)}).`,
        };
      }
    },

    addProject: async (name) => {
      await write("add that project", async () => {
        const taken = new Set(get().projects.map((p) => p.key));
        const base =
          name
            .replace(/[^a-z]/gi, "")
            .slice(0, 3)
            .toUpperCase() || "PRJ";
        let key = base;
        for (let n = 2; taken.has(key); n++) key = `${base}${n}`;
        const project = await q.createProject(name, key);
        set({ projects: await q.listProjects() });
        await get().open({ type: "issues", projectId: project.id });
      });
    },

    renameProject: async (id, name) => {
      await write("rename that project", async () => {
        await q.renameProject(id, name);
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
        });
      });
    },

    removeProject: async (id) => {
      await write("delete that project", async () => {
        await q.deleteProject(id);
        const projects = await q.listProjects();
        set({ projects });
        const v = get().view;
        if (v?.type === "issues" && v.projectId === id) {
          const next = projects[0];
          if (next) await get().open({ type: "issues", projectId: next.id });
          else await get().open({ type: "daily" });
        }
      });
    },

    addIssue: async (title) => {
      await write("add that issue", async () => {
        const v = get().view;
        if (v?.type !== "issues") return;
        await q.createIssue(v.projectId, title);
        await reloadIssues();
      });
    },

    patchIssue: async (id, patch) => {
      await write("save that issue", async () => {
        set({
          issues: get().issues.map((i) =>
            i.id === id ? { ...i, ...patch } : i,
          ),
          dailyIssues: get().dailyIssues.map((i) =>
            i.id === id ? { ...i, ...patch } : i,
          ),
        });
        await q.updateIssue(id, patch);
        await reloadDaily();
      });
    },

    removeIssue: async (id) => {
      await write("delete that issue", async () => {
        set({
          issues: get().issues.filter((i) => i.id !== id),
          dailyIssues: get().dailyIssues.filter((i) => i.id !== id),
        });
        await q.deleteIssue(id);
        await reloadCurrent();
      });
    },

    addList: async (name) => {
      await write("add that list", async () => {
        const list = await q.createTodoList(name);
        set({ lists: await q.listTodoLists() });
        await get().open({ type: "todos", listId: list.id });
      });
    },

    renameList: async (id, name) => {
      if (id === q.INBOX_ID) return;
      await write("rename that list", async () => {
        await q.renameTodoList(id, name);
        set({ lists: await q.listTodoLists() });
      });
    },

    removeList: async (id) => {
      if (id === q.INBOX_ID) return;
      await write("delete that list", async () => {
        await q.deleteTodoList(id);
        set({ lists: await q.listTodoLists() });
        const v = get().view;
        if (v?.type === "todos" && v.listId === id)
          await get().open({ type: "daily" });
      });
    },

    addTodo: async (listId, title) => {
      await write("add that todo", async () => {
        await q.addTodo(listId, title);
        await reloadCurrent();
      });
    },

    setTodoDone: async (id, done) => {
      await write("save that todo", async () => {
        set({
          todos: get().todos.map((t) => (t.id === id ? { ...t, done } : t)),
          // On the Daily view a finished todo leaves the list at once.
          dailyTodos: done
            ? get().dailyTodos.filter((t) => t.id !== id)
            : get().dailyTodos.map((t) => (t.id === id ? { ...t, done } : t)),
        });
        await q.setTodoDone(id, done);
        await reloadCurrent();
      });
    },

    removeTodo: async (id) => {
      await write("delete that todo", async () => {
        set({
          todos: get().todos.filter((t) => t.id !== id),
          dailyTodos: get().dailyTodos.filter((t) => t.id !== id),
        });
        await q.deleteTodo(id);
      });
    },
  };
});

/**
 * A session that stops working shows as finished at once; the reload queued
 * behind it replaces the row with what opencode actually recorded.
 */
onSessionFinished((session) => {
  useStore.setState((state) => ({
    sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
  }));
});
