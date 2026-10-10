import { asc, desc, eq, max } from "drizzle-orm";
import { db } from "./client";
import { issues, projects, todoLists, todos } from "./schema";

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

export const deleteProject = (id: string) =>
  db.delete(projects).where(eq(projects.id, id));

/* Issues */

export const listIssues = (projectId: string) =>
  db
    .select()
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .orderBy(desc(issues.number));

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
  patch: Partial<Pick<typeof issues.$inferInsert, "title" | "description" | "status" | "priority">>,
) => db.update(issues).set({ ...patch, updatedAt: now() }).where(eq(issues.id, id));

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

export const deleteTodoList = (id: string) =>
  db.delete(todoLists).where(eq(todoLists.id, id));

/* Todos. addTodo is also the entry point the launcher's /todo command will call. */

export const listTodos = (listId: string) =>
  db
    .select()
    .from(todos)
    .where(eq(todos.listId, listId))
    .orderBy(asc(todos.done), desc(todos.createdAt));

export const addTodo = (listId: string, title: string) =>
  db.insert(todos).values({ id: newId(), listId, title, createdAt: now() });

export const setTodoDone = (id: string, done: boolean) =>
  db.update(todos).set({ done }).where(eq(todos.id, id));

export const deleteTodo = (id: string) =>
  db.delete(todos).where(eq(todos.id, id));
