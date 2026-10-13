import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";

const valid = {
  version: 1,
  projects: [{ id: "p1", name: "Keel", key: "KEE", createdAt: 1 }],
  issues: [
    {
      id: "i1",
      projectId: "p1",
      number: 1,
      title: "Wire it up",
      description: "",
      status: "todo",
      priority: 0,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  todoLists: [{ id: "inbox", name: "Inbox", createdAt: 1 }],
  todos: [
    { id: "t1", listId: "inbox", title: "Milk", done: false, createdAt: 1 },
  ],
};

describe("parseBackup", () => {
  it("reads an export", () => {
    const result = parseBackup(JSON.stringify(valid));

    expect(result.ok).toBe(true);
  });

  it("rejects anything that is not JSON", () => {
    const result = parseBackup("not json at all");

    expect(result).toEqual({
      ok: false,
      message: "That file is not JSON. Pick a file exported from Keel.",
    });
  });

  it("rejects JSON that is not an export", () => {
    const result = parseBackup(JSON.stringify({ hello: "world" }));

    expect(result).toEqual({
      ok: false,
      message:
        "That file is not a Keel export. Pick a file exported from Keel.",
    });
  });

  it("rejects an export from another version", () => {
    const result = parseBackup(JSON.stringify({ ...valid, version: 2 }));

    expect(result.ok).toBe(false);
  });

  it("rejects a row with the wrong field types", () => {
    const broken = { ...valid, todos: [{ ...valid.todos[0], done: "yes" }] };

    const result = parseBackup(JSON.stringify(broken));

    expect(result.ok).toBe(false);
  });
});
