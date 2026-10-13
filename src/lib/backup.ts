import { z } from "zod";

/**
 * An exported Keel file. Settings are deliberately absent: the shortcut and
 * tray behaviour belong to this machine, not to the backup.
 */
const backupSchema = z.object({
  version: z.literal(1),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      key: z.string(),
      createdAt: z.number(),
    }),
  ),
  issues: z.array(
    z.object({
      id: z.string(),
      projectId: z.string(),
      number: z.number(),
      title: z.string(),
      description: z.string(),
      status: z.string(),
      priority: z.number(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
  ),
  todoLists: z.array(
    z.object({ id: z.string(), name: z.string(), createdAt: z.number() }),
  ),
  todos: z.array(
    z.object({
      id: z.string(),
      listId: z.string(),
      title: z.string(),
      done: z.boolean(),
      createdAt: z.number(),
    }),
  ),
});

export type Backup = z.infer<typeof backupSchema>;

export type BackupResult =
  | { ok: true; data: Backup }
  | { ok: false; message: string };

/** Reads an exported file. Anything unexpected comes back as a message. */
export function parseBackup(text: string): BackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: "That file is not JSON. Pick a file exported from Keel.",
    };
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        "That file is not a Keel export. Pick a file exported from Keel.",
    };
  }
  return { ok: true, data: parsed.data };
}
