import { describe, expect, it, vi } from "vitest";
import {
  type EventLike,
  type EventSource,
  onSessionFinished,
  reportFinished,
  signalOf,
  watch,
} from "./events";
import type { OpenCodeSession } from "./sessions";

const session = (id: string): OpenCodeSession => ({
  id,
  title: "Fix the launcher",
  status: "finished",
  started: 1000,
  finished: 2000,
  outcome: "succeeded",
  directory: "D:\\work",
});

describe("signalOf", () => {
  it("reads a finish out of both shapes opencode uses for one", () => {
    expect(
      signalOf({ type: "session.idle", data: { sessionID: "ses_1" } }),
    ).toEqual({ kind: "finished", sessionId: "ses_1" });
    expect(
      signalOf({
        type: "session.status",
        data: { sessionID: "ses_2", status: { type: "idle" } },
      }),
    ).toEqual({ kind: "finished", sessionId: "ses_2" });
  });

  it("treats the execution endings as finishes too", () => {
    for (const type of [
      "session.execution.succeeded",
      "session.execution.failed",
      "session.execution.interrupted",
    ]) {
      expect(signalOf({ type, data: { sessionID: "ses_3" } })).toEqual({
        kind: "finished",
        sessionId: "ses_3",
      });
    }
  });

  it("only reloads while a session is busy", () => {
    expect(
      signalOf({
        type: "session.status",
        data: { sessionID: "ses_4", status: { type: "busy" } },
      }),
    ).toEqual({ kind: "changed" });
  });

  it("reloads when the list itself changed", () => {
    for (const type of [
      "session.created",
      "session.renamed",
      "session.deleted",
      "session.forked",
      "session.execution.started",
    ]) {
      expect(signalOf({ type })).toEqual({ kind: "changed" });
    }
  });

  it("ignores the traffic that arrives for every token", () => {
    for (const type of [
      "session.text.delta",
      "session.step.streamed",
      "session.tool.progress",
      "server.connected",
      "message.updated",
    ]) {
      expect(signalOf({ type })).toBeNull();
    }
  });

  it("still reloads when opencode names no session", () => {
    expect(signalOf({ type: "session.execution.failed" })).toEqual({
      kind: "changed",
    });
  });
});

describe("finished sessions", () => {
  it("reaches subscribers, and stops when they leave", () => {
    const heard = vi.fn();
    const stop = onSessionFinished(heard);

    reportFinished(session("ses_5"));
    expect(heard).toHaveBeenCalledWith(session("ses_5"));

    stop();
    reportFinished(session("ses_6"));
    expect(heard).toHaveBeenCalledTimes(1);
  });
});

describe("watch", () => {
  /** A stream that hands over one event, when the test says so. */
  const source = (event: unknown, gate: Promise<void>): EventSource => ({
    event: {
      async *subscribe() {
        await gate;
        yield event as EventLike;
      },
    },
  });

  it("passes on what it reads", async () => {
    const seen: string[] = [];
    const stop = watch(
      source({ type: "session.created" }, Promise.resolve()),
      (signal) => seen.push(signal.kind),
    );

    await new Promise((done) => setTimeout(done, 0));
    stop();

    expect(seen).toEqual(["changed"]);
  });

  it("reaches nobody once it has been stopped", async () => {
    const seen: string[] = [];
    let open = () => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const stop = watch(source({ type: "session.created" }, gate), (signal) =>
      seen.push(signal.kind),
    );
    stop();
    open();
    await new Promise((done) => setTimeout(done, 0));

    expect(seen).toEqual([]);
  });
});
