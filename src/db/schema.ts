import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

export const issues = sqliteTable(
  "issues",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("todo"),
    priority: integer("priority").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("issues_project_number").on(t.projectId, t.number)],
);

export const todoLists = sqliteTable("todo_lists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  listId: text("list_id")
    .notNull()
    .references(() => todoLists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

// App settings as a flat key/value store. Values are JSON-encoded.
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type TodoList = typeof todoLists.$inferSelect;
export type Todo = typeof todos.$inferSelect;
