import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

let conn: Promise<Database> | null = null;
const getConn = () => (conn ??= Database.load("sqlite:workspace.db"));

// Statements that return rows (including INSERT/UPDATE ... RETURNING).
const returnsRows = (sql: string) =>
  /^\s*(select|with|pragma)\b/i.test(sql) || /\breturning\b/i.test(sql);

export const db = drizzle(
  async (sql, params, method) => {
    const c = await getConn();

    if (returnsRows(sql)) {
      const rows = await c.select<Record<string, unknown>[]>(sql, params);
      const values = rows.map((r) => Object.values(r));
      return { rows: method === "all" ? values : values[0] };
    }

    await c.execute(sql, params);
    return { rows: [] };
  },
  { schema },
);
