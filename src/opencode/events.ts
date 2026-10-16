/**
 * Following an opencode server for the few events this app reacts to.
 *
 * The stream carries an event for every token and every tool call, so this
 * module reduces all of it to two answers: a session finished, or the list of
 * sessions may have moved on.
 */
import type { OpenCodeClient } from "@opencode/client";
import type { OpenCodeSession } from "./sessions";

/** How long to wait before listening again after the stream drops. */
const RECONNECT_MS = 3000;

/** What the app needs to know about an incoming event. */
export type SessionSignal =
  | { kind: "finished"; sessionId: string }
  | { kind: "changed" };

/** The parts of an event this app reads. */
export interface EventLike {
  type: string;
  data?: unknown;
}

/**
 * Events that mean a session stopped working. Both the status flavour and the
 * execution flavour are listed because opencode announces a finish with either
 * one; a caller that already sees the session as finished ignores the repeat.
 */
const FINISHED = new Set([
  "session.idle",
  "session.execution.succeeded",
  "session.execution.failed",
  "session.execution.interrupted",
]);

/**
 * The other session events that change the list. This is an allow-list of
 * names taken from opencode's event manifest rather than a `session.` prefix
 * test, because the stream also carries a delta per token.
 */
const LIST_CHANGING = new Set([
  "session.created",
  "session.renamed",
  "session.deleted",
  "session.moved",
  "session.forked",
  "session.execution.started",
  "session.usage.updated",
]);

const text = (value: unknown) => (typeof value === "string" ? value : null);

const field = (value: unknown, key: string) =>
  typeof value === "object" && value !== null
    ? text((value as Record<string, unknown>)[key])
    : null;

/** `session.status` nests the status one level in. */
const statusOf = (data: unknown) =>
  field(
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).status
      : null,
    "type",
  );

/** Reads one event, or null for the traffic this app has no use for. */
export function signalOf(event: EventLike): SessionSignal | null {
  const sessionId = field(event.data, "sessionID");

  if (FINISHED.has(event.type)) {
    return sessionId ? { kind: "finished", sessionId } : { kind: "changed" };
  }

  if (event.type === "session.status") {
    if (statusOf(event.data) === "idle" && sessionId) {
      return { kind: "finished", sessionId };
    }
    // Busy and retry mean the session is moving again.
    return { kind: "changed" };
  }

  return LIST_CHANGING.has(event.type) ? { kind: "changed" } : null;
}

/** Told about each session that stopped working while Keel was listening. */
export type SessionFinished = (session: OpenCodeSession) => void;

/** Phase 4 forwards these to the phone, so they stay out of the store. */
const listeners = new Set<SessionFinished>();

/** Subscribes to finished sessions; returns the way to stop listening. */
export function onSessionFinished(listener: SessionFinished): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportFinished(session: OpenCodeSession): void {
  for (const listener of listeners) listener(session);
}

/**
 * Listens to a server until the returned function is called. The stream ends
 * when the service restarts, so this reconnects on its own.
 */
export function watch(
  client: OpenCodeClient,
  onSignal: (signal: SessionSignal) => void,
): () => void {
  const controller = new AbortController();
  let stopped = false;

  const listen = async () => {
    while (!stopped) {
      try {
        for await (const event of client.event.subscribe({
          signal: controller.signal,
        })) {
          const signal = signalOf(event);
          if (signal) onSignal(signal);
        }
      } catch {
        // A dropped stream is ordinary when the service restarts; the wait
        // below is what keeps the retry from spinning.
      }
      if (stopped) return;
      await new Promise((done) => setTimeout(done, RECONNECT_MS));
    }
  };

  void listen();

  return () => {
    stopped = true;
    controller.abort();
  };
}
