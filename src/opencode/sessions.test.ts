import { describe, expect, it } from "vitest";
import { type SessionRecord, toSession } from "./sessions";

const record = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "ses_1",
  title: "Fix the launcher",
  time: { created: 1000, updated: 2000 },
  location: { directory: "D:\\work" },
  ...over,
});

describe("toSession", () => {
  it("leaves a running session without a finish time", () => {
    const session = toSession(record(), true);

    expect(session.status).toBe("running");
    expect(session.finished).toBeNull();
  });

  it("uses the idle time opencode reported", () => {
    const session = toSession(
      record({ time: { created: 1000, updated: 9000, idle: 4000 } }),
      false,
    );

    expect(session.status).toBe("finished");
    expect(session.finished).toBe(4000);
  });

  it("falls back to the last update when there is no idle time", () => {
    expect(toSession(record(), false).finished).toBe(2000);
  });

  it("names a session opencode left untitled", () => {
    expect(toSession(record({ title: "   " }), false).title).toBe(
      "Untitled session",
    );
  });

  it("keeps the outcome opencode decided", () => {
    expect(toSession(record({ outcome: "failed" }), false).outcome).toBe(
      "failed",
    );
    expect(toSession(record(), false).outcome).toBeNull();
  });
});
