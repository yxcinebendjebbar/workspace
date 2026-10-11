import { describe, expect, it } from "vitest";
import {
  nextPriority,
  nextStatus,
  PRIORITIES,
  priorityLabel,
  STATUSES,
  statusMeta,
} from "./constants";

describe("statusMeta", () => {
  it("returns the entry for a known id, first and last included", () => {
    expect(statusMeta("backlog").label).toBe("Backlog");
    expect(statusMeta("in_progress").label).toBe("In progress");
    expect(statusMeta("canceled").label).toBe("Canceled");
  });

  it("falls back to Todo for an unknown id", () => {
    expect(statusMeta("nope").id).toBe("todo");
    expect(statusMeta("").id).toBe("todo");
  });
});

describe("nextStatus", () => {
  it("steps forward through the cycle", () => {
    expect(nextStatus("backlog")).toBe("todo");
    expect(nextStatus("todo")).toBe("in_progress");
    expect(nextStatus("in_progress")).toBe("done");
    expect(nextStatus("done")).toBe("canceled");
  });

  it("wraps from the last status back to the first", () => {
    expect(nextStatus("canceled")).toBe("backlog");
  });

  it("lands on the first status for an unknown id", () => {
    expect(nextStatus("nope")).toBe("backlog");
  });
});

describe("nextPriority", () => {
  it("steps up through the defined levels", () => {
    for (let i = 0; i < PRIORITIES.length - 1; i++) {
      expect(nextPriority(PRIORITIES[i].id)).toBe(PRIORITIES[i + 1].id);
    }
  });

  it("wraps from the last priority back to none", () => {
    expect(nextPriority(PRIORITIES[PRIORITIES.length - 1].id)).toBe(0);
  });
});

describe("priorityLabel", () => {
  it("labels every defined priority", () => {
    for (const p of PRIORITIES) {
      expect(priorityLabel(p.id)).toBe(p.label);
    }
  });

  it("falls back to no priority for anything unknown", () => {
    expect(priorityLabel(99)).toBe("No priority");
    expect(priorityLabel(-1)).toBe("No priority");
  });
});

describe("the status and priority tables", () => {
  it("give every entry a label and a tone for statuses", () => {
    for (const s of STATUSES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.tone.startsWith("text-")).toBe(true);
    }
  });
});
