import { getSetting, setSetting } from "../db/queries";

export type Theme = "system" | "light" | "dark";
export type Accent = "indigo" | "teal" | "orange";

/** Every setting, with the value used when nothing has been stored yet. */
export interface Settings {
  /** System shortcut that toggles the launcher. Applied by Rust on change. */
  launcherShortcut: string;
  /** Hide the launcher shortly after a command runs. */
  closeAfterCommand: boolean;
  /** List that "/todo <text>" writes to. */
  defaultTodoList: string;
  /** Commands hidden from the launcher list. */
  disabledCommands: string[];
  /** Closing the main window keeps Keel alive in the tray. */
  closeToTray: boolean;
  startMinimized: boolean;
  theme: Theme;
  accent: Accent;
}

export const DEFAULT_SETTINGS: Settings = {
  launcherShortcut: "Ctrl+Space",
  closeAfterCommand: true,
  defaultTodoList: "inbox",
  disabledCommands: [],
  closeToTray: true,
  startMinimized: false,
  theme: "system",
  accent: "indigo",
};

/** What each enum setting accepts. A stray value must not reach the DOM. */
const ALLOWED = {
  theme: ["system", "light", "dark"],
  accent: ["indigo", "teal", "orange"],
} as const;

/** Applies a stored value to one field, ignoring anything of the wrong shape. */
const read = <K extends keyof Settings>(
  raw: string | undefined,
  key: K,
): Settings[K] => {
  const fallback = DEFAULT_SETTINGS[key];
  if (raw === undefined) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (key === "theme" || key === "accent") {
      const allowed: readonly string[] =
        key === "theme" ? ALLOWED.theme : ALLOWED.accent;
      return allowed.includes(String(parsed))
        ? (parsed as Settings[K])
        : fallback;
    }
    if (Array.isArray(fallback)) {
      return (
        Array.isArray(parsed)
          ? parsed.every((v) => typeof v === "string")
          : false
      )
        ? (parsed as Settings[K])
        : fallback;
    }
    return typeof parsed === typeof fallback
      ? (parsed as Settings[K])
      : fallback;
  } catch {
    return fallback;
  }
};

export const getSettings = async (): Promise<Settings> => {
  const result: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    // A computed assignment across a union of keys types as `never`, so the
    // value goes through Object.assign, which accepts any shape.
    Object.assign(result, { [key]: read(await getSetting(key), key) });
  }
  return result;
};

export const saveSetting = <K extends keyof Settings>(
  key: K,
  value: Settings[K],
) => setSetting(key, JSON.stringify(value));
