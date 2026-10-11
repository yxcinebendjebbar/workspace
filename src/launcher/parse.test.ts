import { describe, expect, it } from "vitest";
import type { Command } from "./commands/types";
import {
  commandToRun,
  exactCommand,
  matchingCommands,
  parseInput,
} from "./parse";

const makeCommand = (trigger: string): Command => ({
  trigger,
  title: trigger,
  description: "",
  run: async () => ({ ok: true, message: "" }),
});

const commands = [makeCommand("/todo"), makeCommand("/prompt")];

describe("parseInput", () => {
  it("keeps a plain word whole and never treats it as an argument", () => {
    expect(parseInput("hello")).toEqual({
      trigger: "hello",
      args: "",
      typingArgs: false,
    });
  });

  it("keeps the slash when nothing follows it", () => {
    expect(parseInput("/")).toEqual({
      trigger: "/",
      args: "",
      typingArgs: false,
    });
  });

  it("treats a trigger without a trailing space as not yet an argument", () => {
    expect(parseInput("/todo")).toEqual({
      trigger: "/todo",
      args: "",
      typingArgs: false,
    });
  });

  it("starts the argument right after the first space", () => {
    expect(parseInput("/todo ")).toEqual({
      trigger: "/todo",
      args: "",
      typingArgs: true,
    });
    expect(parseInput("/todo buy milk")).toEqual({
      trigger: "/todo",
      args: "buy milk",
      typingArgs: true,
    });
  });

  it("keeps everything after the first space verbatim, including more spaces", () => {
    expect(parseInput("/todo  buy milk")).toEqual({
      trigger: "/todo",
      args: " buy milk",
      typingArgs: true,
    });
    expect(parseInput("/todo buy milk ")).toEqual({
      trigger: "/todo",
      args: "buy milk ",
      typingArgs: true,
    });
  });

  it("splits on the first space only, so slashes in the argument stay put", () => {
    expect(parseInput("/todo #work /later")).toEqual({
      trigger: "/todo",
      args: "#work /later",
      typingArgs: true,
    });
  });

  it("treats a leading space as the separator, leaving an empty trigger", () => {
    expect(parseInput(" /todo")).toEqual({
      trigger: "",
      args: "/todo",
      typingArgs: true,
    });
  });
});

describe("matchingCommands", () => {
  it("offers every command for a lone slash", () => {
    const matches = matchingCommands(commands, parseInput("/"));
    expect(matches.map((c) => c.trigger)).toEqual(["/todo", "/prompt"]);
  });

  it("filters by the trigger typed so far", () => {
    expect(
      matchingCommands(commands, parseInput("/t")).map((c) => c.trigger),
    ).toEqual(["/todo"]);
    expect(
      matchingCommands(commands, parseInput("/p")).map((c) => c.trigger),
    ).toEqual(["/prompt"]);
  });

  it("keeps the fully typed trigger in the list", () => {
    expect(
      matchingCommands(commands, parseInput("/todo")).map((c) => c.trigger),
    ).toEqual(["/todo"]);
  });

  it("hides the list once the argument starts", () => {
    expect(matchingCommands(commands, parseInput("/todo buy"))).toEqual([]);
    expect(matchingCommands(commands, parseInput("/todo "))).toEqual([]);
  });

  it("ignores text that does not start with a slash", () => {
    expect(matchingCommands(commands, parseInput(""))).toEqual([]);
    expect(matchingCommands(commands, parseInput("buy milk"))).toEqual([]);
  });

  it("returns nothing for an unknown trigger", () => {
    expect(matchingCommands(commands, parseInput("/nope"))).toEqual([]);
  });
});

describe("exactCommand", () => {
  it("finds the command only when the trigger is typed in full", () => {
    expect(exactCommand(commands, parseInput("/todo"))?.trigger).toBe("/todo");
    expect(exactCommand(commands, parseInput("/todo "))?.trigger).toBe("/todo");
    expect(exactCommand(commands, parseInput("/to"))).toBeUndefined();
    expect(exactCommand(commands, parseInput("/nope"))).toBeUndefined();
  });

  it("does not match a trigger that is only a prefix of the word typed", () => {
    expect(exactCommand(commands, parseInput("/todos"))).toBeUndefined();
  });
});

describe("commandToRun", () => {
  const todo = commands[0];
  const prompt = commands[1];

  it("runs the typed trigger once an argument is being typed", () => {
    // The list is hidden in argument mode, so active is undefined here. This
    // is the "/todo buy milk" case; it must still resolve to /todo.
    expect(
      commandToRun(commands, parseInput("/todo buy milk"), undefined)?.trigger,
    ).toBe("/todo");
  });

  it("runs the typed trigger even when a stray row is still highlighted", () => {
    expect(
      commandToRun(commands, parseInput("/todo buy milk"), prompt)?.trigger,
    ).toBe("/todo");
  });

  it("resolves a bare trigger with a trailing space", () => {
    expect(
      commandToRun(commands, parseInput("/todo "), undefined)?.trigger,
    ).toBe("/todo");
  });

  it("returns nothing for an unknown trigger while typing arguments", () => {
    expect(
      commandToRun(commands, parseInput("/nope buy milk"), undefined),
    ).toBeUndefined();
  });

  it("runs the highlighted row while the list is still showing", () => {
    expect(commandToRun(commands, parseInput("/t"), prompt)?.trigger).toBe(
      "/prompt",
    );
    expect(commandToRun(commands, parseInput("/"), todo)?.trigger).toBe(
      "/todo",
    );
  });

  it("returns nothing when nothing is highlighted and no trigger is exact", () => {
    expect(commandToRun(commands, parseInput("/t"), undefined)).toBeUndefined();
    expect(commandToRun(commands, parseInput(""), undefined)).toBeUndefined();
  });
});
