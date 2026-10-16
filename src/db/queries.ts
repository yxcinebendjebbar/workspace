import { and, asc, desc, eq, max } from "drizzle-orm";
import type { Backup } from "../lib/backup";
import { db } from "./client";
import { issues, projects, settings, todoLists, todos } from "./schema";

export const INBOX_ID = "inbox";

const now = () => Date.now();
const newId = () => crypto.randomUUID();

/* Projects */

export const listProjects = () =>
  db.select().from(projects).orderBy(asc(projects.createdAt));

export async function createProject(name: string, key: string) {
  const row = { id: newId(), name, key, createdAt: now() };
  await db.insert(projects).values(row);
  return row;
}

export const renameProject = (id: string, name: string) =>
  db.update(projects).set({ name }).where(eq(projects.id, id));

export const deleteProject = (id: string) =>
  db.delete(projects).where(eq(projects.id, id));

/* Issues */

export const listIssues = (projectId: string) =>
  db
    .select()
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .orderBy(desc(issues.number));

/** One issue with the project it belongs to, for views that span projects. */
export type ProjectIssue = typeof issues.$inferSelect & {
  projectKey: string;
  projectName: string;
};

/** The Daily view's "in flight" list: work started but not finished. */
export const listInProgressIssues = async (): Promise<ProjectIssue[]> => {
  const rows = await db
    .select({
      issue: issues,
      projectKey: projects.key,
      projectName: projects.name,
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(eq(issues.status, "in_progress"))
    .orderBy(desc(issues.updatedAt));
  return rows.map((row) => ({
    ...row.issue,
    projectKey: row.projectKey,
    projectName: row.projectName,
  }));
};

export async function createIssue(projectId: string, title: string) {
  const [row] = await db
    .select({ n: max(issues.number) })
    .from(issues)
    .where(eq(issues.projectId, projectId));
  const t = now();
  await db.insert(issues).values({
    id: newId(),
    projectId,
    number: (row?.n ?? 0) + 1,
    title,
    createdAt: t,
    updatedAt: t,
  });
}

export const updateIssue = (
  id: string,
  patch: Partial<
    Pick<
      typeof issues.$inferInsert,
      "title" | "description" | "status" | "priority"
    >
  >,
) =>
  db
    .update(issues)
    .set({ ...patch, updatedAt: now() })
    .where(eq(issues.id, id));

export const deleteIssue = (id: string) =>
  db.delete(issues).where(eq(issues.id, id));

/* Todo lists */

export const listTodoLists = () =>
  db.select().from(todoLists).orderBy(asc(todoLists.createdAt));

export async function createTodoList(name: string) {
  const row = { id: newId(), name, createdAt: now() };
  await db.insert(todoLists).values(row);
  return row;
}

export const renameTodoList = (id: string, name: string) =>
  db.update(todoLists).set({ name }).where(eq(todoLists.id, id));

export const deleteTodoList = (id: string) =>
  db.delete(todoLists).where(eq(todoLists.id, id));

/* Todos. addTodo is also the entry point the launcher's /todo command will call. */

export const listTodos = (listId: string) =>
  db
    .select()
    .from(todos)
    .where(eq(todos.listId, listId))
    .orderBy(asc(todos.done), desc(todos.createdAt));

/** Unfinished todos in a list; the Daily view shows these for the Inbox. */
export const listOpenTodos = (listId: string) =>
  db
    .select()
    .from(todos)
    .where(and(eq(todos.listId, listId), eq(todos.done, false)))
    .orderBy(desc(todos.createdAt));

export const addTodo = (listId: string, title: string) =>
  db.insert(todos).values({ id: newId(), listId, title, createdAt: now() });

export const setTodoDone = (id: string, done: boolean) =>
  db.update(todos).set({ done }).where(eq(todos.id, id));

export const deleteTodo = (id: string) =>
  db.delete(todos).where(eq(todos.id, id));

/* Settings. Values are JSON, so a setting can be a string, a number, or a
   boolean without a column per key. */

/** Every stored setting in one read. Startup and "/todo" both need all of them. */
export const listSettings = () => db.select().from(settings);

export const setSetting = (key: string, value: string) =>
  db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });

/* Backup */

/** Everything a backup file holds. Settings stay on this machine. */
export async function exportData(): Promise<Backup> {
  const [p, i, l, t] = await Promise.all([
    db.select().from(projects),
    db.select().from(issues),
    db.select().from(todoLists),
    db.select().from(todos),
  ]);
  return { version: 1, projects: p, issues: i, todoLists: l, todos: t };
}

/**
 * Adds what a backup holds, skipping anything already here. Rows whose parent
 * is missing are dropped rather than failing the whole import.
 */
export async function importData(data: Backup) {
  await db.insert(projects).values(data.projects).onConflictDoNothing();
  await db.insert(todoLists).values(data.todoLists).onConflictDoNothing();
  const [projectRows, listRows] = await Promise.all([
    db.select({ id: projects.id }).from(projects),
    db.select({ id: todoLists.id }).from(todoLists),
  ]);
  const projectIds = new Set(projectRows.map((r) => r.id));
  const listIds = new Set(listRows.map((r) => r.id));
  await db
    .insert(issues)
    .values(data.issues.filter((i) => projectIds.has(i.projectId)))
    .onConflictDoNothing();
  await db
    .insert(todos)
    .values(data.todos.filter((t) => listIds.has(t.listId)))
    .onConflictDoNothing();
}

/** Empties the workspace. Children first, so the cascades stay out of it. */
export async function resetAllData() {
  await db.delete(todos);
  await db.delete(todoLists);
  await db.delete(issues);
  await db.delete(projects);
}
