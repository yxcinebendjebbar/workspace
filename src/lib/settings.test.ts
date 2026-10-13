import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSetting: vi.fn<(key: string) => Promise<string | undefined>>(),
  setSetting: vi.fn<(key: string, value: string) => Promise<void>>(),
}));

// The settings module only touches these two functions, so mocking them keeps
// the tests away from SQLite and the Tauri plugin.
vi.mock("../db/queries", () => mocks);

import { DEFAULT_SETTINGS, getSettings, saveSetting } from "./settings";

/** Every key reads from the mock, so tests only have to say what changes. */
const stored = (values: Record<string, string>) => {
  mocks.getSetting.mockImplementation(async (key) => values[key]);
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSetting.mockResolvedValue(undefined);
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
    mocks.getSetting.mockResolvedValue("not json at all");

    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
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
