import { create } from "zustand";
import * as q from "./db/queries";
import type { Issue, Project, Todo, TodoList } from "./db/schema";

export type View =
  | { type: "issues"; projectId: string }
  | { type: "todos"; listId: string };

export type IssuePatch = Partial<
  Pick<Issue, "title" | "description" | "status" | "priority">
>;

interface Store {
  ready: boolean;
  view: View | null;
  projects: Project[];
  lists: TodoList[];
  issues: Issue[];
  todos: Todo[];

  init: () => Promise<void>;
  open: (view: View) => Promise<void>;
  /** Reloads lists and the open view, e.g. after the launcher wrote something. */
  refresh: () => Promise<void>;

  addProject: (name: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;

  addIssue: (title: string) => Promise<void>;
  patchIssue: (id: string, patch: IssuePatch) => Promise<void>;
  removeIssue: (id: string) => Promise<void>;

  addList: (name: string) => Promise<void>;
  removeList: (id: string) => Promise<void>;

  addTodo: (title: string) => Promise<void>;
  setTodoDone: (id: string, done: boolean) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
}

export const useStore = create<Store>((set, get) => {
  const reloadIssues = async () => {
    const v = get().view;
    if (v?.type === "issues") set({ issues: await q.listIssues(v.projectId) });
  };
  const reloadTodos = async () => {
    const v = get().view;
    if (v?.type === "todos") set({ todos: await q.listTodos(v.listId) });
  };
  const openInbox = () => get().open({ type: "todos", listId: q.INBOX_ID });

  return {
    ready: false,
    view: null,
    projects: [],
    lists: [],
    issues: [],
    todos: [],

    init: async () => {
      const [projects, lists] = await Promise.all([
        q.listProjects(),
        q.listTodoLists(),
      ]);
      set({ projects, lists, ready: true });
      const first = projects[0];
      if (first) await get().open({ type: "issues", projectId: first.id });
      else await openInbox();
    },

    open: async (view) => {
      set({ view });
      if (view.type === "issues") await reloadIssues();
      else await reloadTodos();
    },

    // The launcher writes through its own connection, so the main window
    // reloads when it hears data-changed.
    refresh: async () => {
      const v = get().view;
      set({ lists: await q.listTodoLists() });
      if (v?.type === "todos") set({ todos: await q.listTodos(v.listId) });
      else if (v?.type === "issues") set({ issues: await q.listIssues(v.projectId) });
    },

    addProject: async (name) => {
      const taken = new Set(get().projects.map((p) => p.key));
      const base = name.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "PRJ";
      let key = base;
      for (let n = 2; taken.has(key); n++) key = `${base}${n}`;
      const project = await q.createProject(name, key);
      set({ projects: await q.listProjects() });
      await get().open({ type: "issues", projectId: project.id });
    },

    removeProject: async (id) => {
      await q.deleteProject(id);
      const projects = await q.listProjects();
      set({ projects });
      const v = get().view;
      if (v?.type === "issues" && v.projectId === id) {
        const next = projects[0];
        if (next) await get().open({ type: "issues", projectId: next.id });
        else await openInbox();
      }
    },

    addIssue: async (title) => {
      const v = get().view;
      if (v?.type !== "issues") return;
      await q.createIssue(v.projectId, title);
      await reloadIssues();
    },

    patchIssue: async (id, patch) => {
      set({
        issues: get().issues.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      });
      await q.updateIssue(id, patch);
    },

    removeIssue: async (id) => {
      set({ issues: get().issues.filter((i) => i.id !== id) });
      await q.deleteIssue(id);
    },

    addList: async (name) => {
      const list = await q.createTodoList(name);
      set({ lists: await q.listTodoLists() });
      await get().open({ type: "todos", listId: list.id });
    },

    removeList: async (id) => {
      if (id === q.INBOX_ID) return;
      await q.deleteTodoList(id);
      set({ lists: await q.listTodoLists() });
      const v = get().view;
      if (v?.type === "todos" && v.listId === id) await openInbox();
    },

    addTodo: async (title) => {
      const v = get().view;
      if (v?.type !== "todos") return;
      await q.addTodo(v.listId, title);
      await reloadTodos();
    },

    setTodoDone: async (id, done) => {
      set({
        todos: get().todos.map((t) => (t.id === id ? { ...t, done } : t)),
      });
      await q.setTodoDone(id, done);
      await reloadTodos();
    },

    removeTodo: async (id) => {
      set({ todos: get().todos.filter((t) => t.id !== id) });
      await q.deleteTodo(id);
    },
  };
});
