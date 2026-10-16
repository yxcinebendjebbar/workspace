import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectIssue } from "./db/queries";
import type { Issue, Project, Todo, TodoList } from "./db/schema";
import type { IssuePatch } from "./store";

// The store talks to the database only through this module, so mocking it
// keeps the tests free of SQLite and of the Tauri plugin.
const mocks = vi.hoisted(() => ({
  listProjects: vi.fn<() => Promise<Project[]>>(),
  createProject: vi.fn<(name: string, key: string) => Promise<Project>>(),
  renameProject: vi.fn<(id: string, name: string) => Promise<void>>(),
  deleteProject: vi.fn<(id: string) => Promise<void>>(),

  listIssues: vi.fn<(projectId: string) => Promise<Issue[]>>(),
  createIssue: vi.fn<(projectId: string, title: string) => Promise<void>>(),
  updateIssue: vi.fn<(id: string, patch: IssuePatch) => Promise<void>>(),
  deleteIssue: vi.fn<(id: string) => Promise<void>>(),

  listTodoLists: vi.fn<() => Promise<TodoList[]>>(),
  createTodoList: vi.fn<(name: string) => Promise<TodoList>>(),
  renameTodoList: vi.fn<(id: string, name: string) => Promise<void>>(),
  deleteTodoList: vi.fn<(id: string) => Promise<void>>(),

  listTodos: vi.fn<(listId: string) => Promise<Todo[]>>(),
  listOpenTodos: vi.fn<(listId: string) => Promise<Todo[]>>(),
  addTodo: vi.fn<(listId: string, title: string) => Promise<void>>(),
  setTodoDone: vi.fn<(id: string, done: boolean) => Promise<void>>(),
  deleteTodo: vi.fn<(id: string) => Promise<void>>(),

  listInProgressIssues: vi.fn<() => Promise<ProjectIssue[]>>(),
}));

// The opencode bridge, reduced to a fake server the store can read from.
const opencode = vi.hoisted(() => ({
  connect: vi.fn(),
  watch: vi.fn<
    (client: unknown, onSignal: (signal: unknown) => void) => () => void
  >(() => () => {}),
  session: { list: vi.fn(), active: vi.fn() },
}));

const tauri = vi.hoisted(() => ({
  invoke: vi.fn<(cmd: string, args?: object) => Promise<unknown>>(),
  show: vi.fn<() => Promise<void>>(),
  saveSetting: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  getSettings: vi.fn<() => Promise<object>>(),
  settings: {
    theme: "system" as const,
    accent: "indigo" as const,
    launcherShortcut: "Ctrl+Space",
    closeAfterCommand: true,
    defaultTodoList: "inbox",
    disabledCommands: [] as string[],
    closeToTray: true,
    startMinimized: false,
    opencodeDirectory: "",
    opencodeServerUrl: "",
  },
}));

vi.mock("./db/queries", () => ({
  INBOX_ID: "inbox",
  ...mocks,
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ show: tauri.show, setFocus: vi.fn() }),
}));
vi.mock("./lib/settings", () => ({
  DEFAULT_SETTINGS: tauri.settings,
  getSettings: tauri.getSettings,
  saveSetting: tauri.saveSetting,
}));
vi.mock("./lib/appearance", () => ({
  applyAppearance: vi.fn(),
  watchSystemTheme: vi.fn(() => () => {}),
}));
vi.mock("./opencode/client", () => ({ opencode: opencode.connect }));
// Only the stream is faked: the finished-session listener stays real, so the
// test can see what the store does with one.
vi.mock("./opencode/events", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./opencode/events")>()),
  watch: opencode.watch,
}));

import { onSessionFinished } from "./opencode/events";
import { useStore } from "./store";

const project = (id: string, name: string, key: string): Project => ({
  id,
  name,
  key,
  createdAt: 0,
});

const list = (id: string, name: string): TodoList => ({
  id,
  name,
  createdAt: 0,
});

const todo = (
  id: string,
  listId: string,
  title: string,
  done = false,
): Todo => ({ id, listId, title, done, createdAt: 0 });

const issue = (id: string, projectId: string, title: string): Issue => ({
  id,
  projectId,
  number: 1,
  title,
  description: "",
  status: "todo",
  priority: 0,
  createdAt: 0,
  updatedAt: 0,
});

const projectIssue = (
  id: string,
  projectId: string,
  title: string,
): ProjectIssue => ({
  ...issue(id, projectId, title),
  status: "in_progress",
  projectKey: "KEE",
  projectName: "Keel",
});

beforeEach(() => {
  // reset, not just clear: a test that replaces an implementation would
  // otherwise leave it hanging for the tests after it.
  vi.resetAllMocks();
  tauri.invoke.mockResolvedValue("Ctrl+Space");
  opencode.connect.mockResolvedValue({
    ok: true,
    version: "2.0.29",
    client: { session: opencode.session },
  });
  tauri.getSettings.mockImplementation(async () => ({ ...tauri.settings }));
  Object.assign(tauri.settings, {
    theme: "system",
    accent: "indigo",
    launcherShortcut: "Ctrl+Space",
    closeAfterCommand: true,
    defaultTodoList: "inbox",
    disabledCommands: [],
    closeToTray: true,
    startMinimized: false,
  });
  useStore.setState({
    ready: false,
    view: null,
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
    settings: { ...tauri.settings },
  });
  mocks.listProjects.mockResolvedValue([]);
  mocks.listTodoLists.mockResolvedValue([]);
  mocks.listIssues.mockResolvedValue([]);
  mocks.listTodos.mockResolvedValue([]);
  mocks.listOpenTodos.mockResolvedValue([]);
  mocks.listInProgressIssues.mockResolvedValue([]);
});

describe("init", () => {
  it("loads both sides, shows the window and opens the Daily view", async () => {
    mocks.listProjects.mockResolvedValue([project("p1", "Keel", "KEE")]);

    await useStore.getState().init();

    expect(useStore.getState().ready).toBe(true);
    expect(tauri.show).toHaveBeenCalled();
    expect(useStore.getState().view).toEqual({ type: "daily" });
  });

  it("keeps the window hidden when it should start minimized", async () => {
    tauri.settings.startMinimized = true;

    await useStore.getState().init();

    expect(tauri.show).not.toHaveBeenCalled();
  });

  it("loads open Inbox todos and in-progress issues", async () => {
    mocks.listOpenTodos.mockResolvedValue([todo("t1", "inbox", "Milk")]);
    mocks.listInProgressIssues.mockResolvedValue([
      projectIssue("i1", "p1", "Wire it up"),
    ]);

    await useStore.getState().init();

    expect(mocks.listOpenTodos).toHaveBeenCalledWith("inbox");
    expect(useStore.getState().dailyTodos).toHaveLength(1);
    expect(useStore.getState().dailyIssues).toHaveLength(1);
  });

  it("shows the window and says so when settings cannot be read", async () => {
    tauri.getSettings.mockRejectedValueOnce(new Error("disk unreadable"));

    await useStore.getState().init();

    // A hidden window could never report this, so it shows regardless.
    expect(tauri.show).toHaveBeenCalled();
    expect(useStore.getState().initError).toContain("disk unreadable");
    expect(useStore.getState().ready).toBe(true);
  });

  it("renders anyway when the workspace cannot be loaded", async () => {
    mocks.listProjects.mockRejectedValueOnce(new Error("table missing"));

    await useStore.getState().init();

    expect(useStore.getState().ready).toBe(true);
    expect(useStore.getState().initError).toContain("table missing");
    expect(useStore.getState().view).toBeNull();
  });
});

describe("open", () => {
  it("loads issues for a project view", async () => {
    mocks.listIssues.mockResolvedValue([issue("i1", "p1", "Title")]);

    await useStore.getState().open({ type: "issues", projectId: "p1" });

    expect(mocks.listIssues).toHaveBeenCalledWith("p1");
    expect(useStore.getState().issues).toHaveLength(1);
  });

  it("loads todos for a list view", async () => {
    mocks.listTodos.mockResolvedValue([todo("t1", "work", "Ship it")]);

    await useStore.getState().open({ type: "todos", listId: "work" });

    expect(mocks.listTodos).toHaveBeenCalledWith("work");
    expect(useStore.getState().todos).toHaveLength(1);
  });
});

const record = (id: string, over: object = {}) => ({
  id,
  title: `Session ${id}`,
  time: { created: 1000, updated: 2000 },
  location: { directory: "D:\\work" },
  ...over,
});

describe("sessions", () => {
  it("shows what opencode is running and what it finished", async () => {
    opencode.session.list.mockResolvedValue({
      data: [
        record("ses_a"),
        record("ses_b", {
          outcome: "failed",
          time: { created: 3000, idle: 3500 },
        }),
      ],
    });
    opencode.session.active.mockResolvedValue({ ses_a: { type: "running" } });

    await useStore.getState().watchOpenCode();

    const sessions = useStore.getState().sessions;
    expect(sessions.map((s) => [s.id, s.status])).toEqual([
      ["ses_a", "running"],
      ["ses_b", "finished"],
    ]);
    expect(sessions[1].finished).toBe(3500);
    expect(useStore.getState().opencodeConnected).toBe(true);
  });

  it("reads sessions from the configured server and folder", async () => {
    useStore.setState((state) => ({
      settings: {
        ...state.settings,
        opencodeServerUrl: "http://127.0.0.1:4096",
        opencodeDirectory: "D:\\work",
      },
    }));
    opencode.session.list.mockResolvedValue({ data: [] });
    opencode.session.active.mockResolvedValue({});

    await useStore.getState().reloadSessions();

    expect(opencode.connect).toHaveBeenCalledWith("http://127.0.0.1:4096");
    expect(opencode.session.list).toHaveBeenCalledWith({
      limit: 20,
      order: "desc",
      directory: "D:\\work",
    });
  });

  it("keeps the reason opencode could not be reached", async () => {
    opencode.connect.mockResolvedValue({
      ok: false,
      message: "opencode is not installed.",
    });

    await useStore.getState().watchOpenCode();

    expect(useStore.getState().opencodeError).toBe(
      "opencode is not installed.",
    );
    expect(useStore.getState().opencodeConnected).toBe(false);
    expect(useStore.getState().sessions).toEqual([]);
  });

  it("reports a finish once, for a session it watched run", async () => {
    vi.useFakeTimers();
    try {
      opencode.session.list.mockResolvedValue({ data: [record("ses_a")] });
      opencode.session.active.mockResolvedValue({ ses_a: { type: "running" } });
      const heard: string[] = [];
      const stop = onSessionFinished((s) => heard.push(s.id));

      await useStore.getState().watchOpenCode();
      const onSignal = opencode.watch.mock.calls[0][1];

      onSignal({ kind: "finished", sessionId: "ses_a" });
      expect(useStore.getState().sessions[0].status).toBe("finished");

      // opencode announces one finish with more than one event.
      onSignal({ kind: "finished", sessionId: "ses_a" });
      expect(heard).toEqual(["ses_a"]);

      // The queued reload then replaces the row with opencode's own record.
      opencode.session.list.mockResolvedValue({
        data: [
          record("ses_a", {
            outcome: "succeeded",
            time: { created: 1000, updated: 2500, idle: 2400 },
          }),
        ],
      });
      // opencode has stopped listing it as active by the time we reread.
      opencode.session.active.mockResolvedValue({});
      await vi.advanceTimersByTimeAsync(300);
      expect(useStore.getState().sessions[0].finished).toBe(2400);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("addProject", () => {
  it("derives a three letter key from the name", async () => {
    mocks.createProject.mockImplementation(async (name, key) =>
      project("p9", name, key),
    );
    mocks.listProjects.mockResolvedValue([
      project("p9", "Design System", "DES"),
    ]);

    await useStore.getState().addProject("Design System");

    expect(mocks.createProject).toHaveBeenCalledWith("Design System", "DES");
    expect(useStore.getState().view).toEqual({
      type: "issues",
      projectId: "p9",
    });
  });

  it("falls back to PRJ when the name has no letters", async () => {
    mocks.createProject.mockImplementation(async (name, key) =>
      project("p9", name, key),
    );

    await useStore.getState().addProject("123");

    expect(mocks.createProject).toHaveBeenCalledWith("123", "PRJ");
  });

  it("adds a number when the key is already taken", async () => {
    useStore.setState({
      projects: [project("p1", "Design System", "DES")],
    });
    mocks.createProject.mockImplementation(async (name, key) =>
      project("p9", name, key),
    );

    await useStore.getState().addProject("Design Studio");

    expect(mocks.createProject).toHaveBeenCalledWith("Design Studio", "DES2");
  });
});

describe("renameProject", () => {
  it("writes the new name and updates the row in place", async () => {
    useStore.setState({ projects: [project("p1", "Keel", "KEE")] });

    await useStore.getState().renameProject("p1", "Keel v2");

    expect(mocks.renameProject).toHaveBeenCalledWith("p1", "Keel v2");
    expect(useStore.getState().projects[0].name).toBe("Keel v2");
  });
});

describe("removeProject", () => {
  it("opens the next project when the open one is deleted", async () => {
    const p1 = project("p1", "Keel", "KEE");
    const p2 = project("p2", "Site", "SIT");
    useStore.setState({ projects: [p1, p2] });
    await useStore.getState().open({ type: "issues", projectId: "p1" });
    mocks.listProjects.mockResolvedValue([p2]);

    await useStore.getState().removeProject("p1");

    expect(useStore.getState().projects).toEqual([p2]);
    expect(useStore.getState().view).toEqual({
      type: "issues",
      projectId: "p2",
    });
  });

  it("falls back to the Daily view when the last project is deleted", async () => {
    useStore.setState({ projects: [project("p1", "Keel", "KEE")] });
    await useStore.getState().open({ type: "issues", projectId: "p1" });
    mocks.listProjects.mockResolvedValue([]);

    await useStore.getState().removeProject("p1");

    expect(useStore.getState().view).toEqual({ type: "daily" });
  });

  it("leaves the open view alone when another project is deleted", async () => {
    useStore.setState({
      projects: [project("p1", "Keel", "KEE"), project("p2", "Site", "SIT")],
    });
    await useStore.getState().open({ type: "issues", projectId: "p2" });
    mocks.listProjects.mockResolvedValue([project("p2", "Site", "SIT")]);

    await useStore.getState().removeProject("p1");

    expect(useStore.getState().view).toEqual({
      type: "issues",
      projectId: "p2",
    });
  });
});

describe("addIssue", () => {
  it("adds to the open project and reloads the view", async () => {
    await useStore.getState().open({ type: "issues", projectId: "p1" });
    mocks.listIssues.mockResolvedValue([issue("i1", "p1", "Title")]);

    await useStore.getState().addIssue("Title");

    expect(mocks.createIssue).toHaveBeenCalledWith("p1", "Title");
    expect(useStore.getState().issues).toHaveLength(1);
  });

  it("does nothing outside an issues view", async () => {
    await useStore.getState().open({ type: "todos", listId: "inbox" });

    await useStore.getState().addIssue("Title");

    expect(mocks.createIssue).not.toHaveBeenCalled();
  });
});

describe("patchIssue", () => {
  it("updates the row in place before the write lands", async () => {
    useStore.setState({ issues: [issue("i1", "p1", "Old")] });
    let finishWrite = () => {};
    mocks.updateIssue.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );

    const pending = useStore.getState().patchIssue("i1", { title: "New" });

    expect(useStore.getState().issues[0].title).toBe("New");
    expect(mocks.updateIssue).toHaveBeenCalledWith("i1", { title: "New" });

    finishWrite();
    await pending;
  });

  it("drops the issue from the Daily view when it stops being in progress", async () => {
    useStore.setState({
      view: { type: "daily" },
      dailyIssues: [projectIssue("i1", "p1", "Wire it up")],
    });
    mocks.listInProgressIssues.mockResolvedValue([]);

    await useStore.getState().patchIssue("i1", { status: "done" });

    expect(useStore.getState().dailyIssues).toHaveLength(0);
  });
});

describe("removeIssue", () => {
  it("drops the row and writes the deletion", async () => {
    useStore.setState({
      issues: [issue("i1", "p1", "Keep"), issue("i2", "p1", "Gone")],
    });

    await useStore.getState().removeIssue("i2");

    expect(mocks.deleteIssue).toHaveBeenCalledWith("i2");
    expect(useStore.getState().issues.map((i) => i.id)).toEqual(["i1"]);
  });
});

describe("renameList", () => {
  it("writes the new name and reloads the lists", async () => {
    mocks.listTodoLists.mockResolvedValue([
      list("inbox", "Inbox"),
      list("work", "Work v2"),
    ]);

    await useStore.getState().renameList("work", "Work v2");

    expect(mocks.renameTodoList).toHaveBeenCalledWith("work", "Work v2");
    expect(useStore.getState().lists[1].name).toBe("Work v2");
  });

  it("never renames the Inbox", async () => {
    await useStore.getState().renameList("inbox", "Not Inbox");

    expect(mocks.renameTodoList).not.toHaveBeenCalled();
  });
});

describe("removeList", () => {
  it("opens the Daily view when the open list is deleted", async () => {
    await useStore.getState().open({ type: "todos", listId: "work" });
    mocks.listTodoLists.mockResolvedValue([list("inbox", "Inbox")]);

    await useStore.getState().removeList("work");

    expect(mocks.deleteTodoList).toHaveBeenCalledWith("work");
    expect(useStore.getState().view).toEqual({ type: "daily" });
  });

  it("never deletes the Inbox", async () => {
    await useStore.getState().removeList("inbox");

    expect(mocks.deleteTodoList).not.toHaveBeenCalled();
  });
});

describe("addTodo", () => {
  it("adds to the given list and reloads it", async () => {
    await useStore.getState().open({ type: "todos", listId: "work" });
    mocks.listTodos.mockResolvedValue([todo("t1", "work", "Ship it")]);

    await useStore.getState().addTodo("work", "Ship it");

    expect(mocks.addTodo).toHaveBeenCalledWith("work", "Ship it");
    expect(useStore.getState().todos).toHaveLength(1);
  });

  it("reloads the Daily view when that is what is open", async () => {
    await useStore.getState().open({ type: "daily" });
    mocks.listOpenTodos.mockResolvedValue([todo("t1", "inbox", "Milk")]);

    await useStore.getState().addTodo("inbox", "Milk");

    expect(useStore.getState().dailyTodos).toHaveLength(1);
  });
});

describe("setTodoDone", () => {
  it("flips the row in place and reloads the list", async () => {
    useStore.setState({ todos: [todo("t1", "inbox", "Milk")] });
    await useStore.getState().open({ type: "todos", listId: "inbox" });
    mocks.listTodos.mockResolvedValue([todo("t1", "inbox", "Milk", true)]);

    await useStore.getState().setTodoDone("t1", true);

    expect(mocks.setTodoDone).toHaveBeenCalledWith("t1", true);
    expect(useStore.getState().todos[0].done).toBe(true);
  });

  it("drops the todo from the Daily view as soon as it is done", async () => {
    useStore.setState({
      view: { type: "daily" },
      dailyTodos: [todo("t1", "inbox", "Milk")],
    });

    await useStore.getState().setTodoDone("t1", true);

    expect(useStore.getState().dailyTodos).toHaveLength(0);
  });
});

describe("setSetting", () => {
  it("stores the value and shows the window change right away", async () => {
    await useStore.getState().setSetting("closeAfterCommand", false);

    expect(tauri.saveSetting).toHaveBeenCalledWith("closeAfterCommand", false);
    expect(useStore.getState().settings.closeAfterCommand).toBe(false);
  });

  it("keeps the shortcut Rust actually registered", async () => {
    tauri.invoke.mockResolvedValue("Alt+Shift+Space");

    await useStore.getState().setSetting("launcherShortcut", "Ctrl+K");

    expect(useStore.getState().settings.launcherShortcut).toBe(
      "Alt+Shift+Space",
    );
    expect(tauri.saveSetting).toHaveBeenCalledWith(
      "launcherShortcut",
      "Alt+Shift+Space",
    );
  });
});

describe("refresh", () => {
  it("reloads the lists and the open todos view", async () => {
    await useStore.getState().open({ type: "todos", listId: "inbox" });
    mocks.listTodoLists.mockResolvedValue([
      list("inbox", "Inbox"),
      list("work", "Work"),
    ]);
    mocks.listTodos.mockResolvedValue([todo("t1", "inbox", "Milk")]);

    await useStore.getState().refresh();

    expect(useStore.getState().lists).toHaveLength(2);
    expect(useStore.getState().todos).toHaveLength(1);
  });

  it("reloads the open issues view too", async () => {
    mocks.listProjects.mockResolvedValue([project("p1", "Keel", "KEE")]);
    await useStore.getState().open({ type: "issues", projectId: "p1" });
    mocks.listIssues.mockResolvedValue([issue("i1", "p1", "Title")]);

    await useStore.getState().refresh();

    expect(mocks.listIssues).toHaveBeenCalledWith("p1");
    expect(useStore.getState().issues).toHaveLength(1);
  });

  it("leaves the Daily view when the open list is deleted elsewhere", async () => {
    await useStore.getState().open({ type: "todos", listId: "work" });
    mocks.listTodoLists.mockResolvedValue([list("inbox", "Inbox")]);

    await useStore.getState().refresh();

    expect(useStore.getState().view).toEqual({ type: "daily" });
  });
});
