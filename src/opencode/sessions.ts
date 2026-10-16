/** What a session is doing right now. */
export type SessionStatus = "running" | "finished";

/** One opencode session, reduced to what this app shows. */
export interface OpenCodeSession {
  id: string;
  title: string;
  status: SessionStatus;
  /** Epoch milliseconds, on opencode's clock. */
  started: number;
  /** When it stopped working, or null while it runs. */
  finished: number | null;
  /** How its last turn ended, once opencode has decided. */
  outcome: "succeeded" | "failed" | "interrupted" | null;
  /** The folder opencode works in. */
  directory: string;
}

/**
 * The part of an opencode session record this app reads. Declared here rather
 * than imported from the SDK so this module answers one question: what does the
 * app need, and what does it fall back to when opencode stays quiet.
 */
export interface SessionRecord {
  id: string;
  title?: string;
  outcome?: "succeeded" | "failed" | "interrupted";
  time: { created: number; updated: number; idle?: number };
  location: { directory: string };
}

export function toSession(
  record: SessionRecord,
  running: boolean,
): OpenCodeSession {
  return {
    id: record.id,
    title: record.title?.trim() || "Untitled session",
    status: running ? "running" : "finished",
    started: record.time.created,
    // A session that ran to idle says when; older ones only have their last
    // update to go on.
    finished: running ? null : (record.time.idle ?? record.time.updated),
    outcome: record.outcome ?? null,
    directory: record.location.directory,
  };
}
