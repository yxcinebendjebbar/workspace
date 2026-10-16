import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listSettings: vi.fn<() => Promise<{ key: string; value: string }[]>>(),
  setSetting: vi.fn<(key: string, value: string) => Promise<void>>(),
}));

// The settings module only touches these two functions, so mocking them keeps
// the tests away from SQLite and the Tauri plugin.
vi.mock("../db/queries", () => mocks);

import { DEFAULT_SETTINGS, getSettings, saveSetting } from "./settings";

/** Every key reads from the mock, so tests only have to say what changes. */
const stored = (values: Record<string, string>) => {
  mocks.listSettings.mockImplementation(async () =>
    Object.entries(values).map(([key, value]) => ({ key, value })),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listSettings.mockResolvedValue([]);
});

describe("getSettings", () => {
  it("returns the defaults when nothing has been stored", async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("reads stored values", async () => {
    stored({
      closeAfterCommand: "false",
      disabledCommands: '["/todo"]',
      theme: '"dark"',
    });

    const settings = await getSettings();

    expect(settings.closeAfterCommand).toBe(false);
    expect(settings.disabledCommands).toEqual(["/todo"]);
    expect(settings.theme).toBe("dark");
  });

  it("ignores a theme that is not one of the three", async () => {
    stored({ theme: '"purple"' });

    expect((await getSettings()).theme).toBe("system");
  });

  it("ignores an accent that is not one of the three", async () => {
    stored({ accent: '"lime"' });

    expect((await getSettings()).accent).toBe("indigo");
  });

  it("ignores a value of the wrong type", async () => {
    stored({ startMinimized: '"yes"' });

    expect((await getSettings()).startMinimized).toBe(false);
  });

  it("ignores a command list that is not strings", async () => {
    stored({ disabledCommands: "[1, 2]" });

    expect((await getSettings()).disabledCommands).toEqual([]);
  });

  it("falls back when the stored value is not JSON", async () => {
    mocks.listSettings.mockImplementation(async () =>
      Object.keys(DEFAULT_SETTINGS).map((key) => ({
        key,
        value: "not json at all",
      })),
    );

    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("reads every setting in a single query", async () => {
    await getSettings();

    // One round trip through the plugin, not one per key: this runs at
    // startup and on every /todo.
    expect(mocks.listSettings).toHaveBeenCalledTimes(1);
  });
});

describe("saveSetting", () => {
  it("writes JSON so it reads back the same", async () => {
    await saveSetting("disabledCommands", ["/prompt"]);

    expect(mocks.setSetting).toHaveBeenCalledWith(
      "disabledCommands",
      '["/prompt"]',
    );
  });
});
