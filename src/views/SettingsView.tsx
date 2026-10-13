import { appDataDir, appLogDir, join } from "@tauri-apps/api/path";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  open as openDialog,
  save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { type FormEvent, useEffect, useState } from "react";
import { version } from "../../package.json";
import { Segmented } from "../components/Segmented";
import { Toggle } from "../components/Toggle";
import { exportData, INBOX_ID, importData, resetAllData } from "../db/queries";
import { commands } from "../launcher/commands";
import { parseBackup } from "../lib/backup";
import { errorMessage } from "../lib/errors";
import type { Theme } from "../lib/settings";
import {
  inputClass,
  smallDangerButtonClass,
  smallPrimaryButtonClass,
  smallSecondaryButtonClass,
} from "../lib/styles";
import { useStore } from "../store";

const THEMES: { id: Theme; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function SettingsView() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <GeneralGroup />
      <LauncherGroup />
      <TweaksGroup />
      <Group
        title="opencode"
        note="These controls take effect in phase 3, when Keel starts and talks to opencode."
      >
        <Row label="Project folder">
          <input
            disabled
            placeholder="The folder opencode works in"
            className={inputClass}
          />
        </Row>
        <Row label="Server mode">
          <Segmented
            label="Server mode"
            disabled
            options={[
              { id: "managed", label: "Keel starts it" },
              { id: "existing", label: "Already running" },
            ]}
            value="managed"
            onChange={() => {}}
          />
        </Row>
        <Row label="Server address">
          <input
            disabled
            placeholder="http://127.0.0.1:port"
            className={inputClass}
          />
        </Row>
        <Row label="Server status" description="Stopped">
          <button type="button" disabled className={smallSecondaryButtonClass}>
            Restart
          </button>
        </Row>
      </Group>
      <Group
        title="Phone link"
        note="These controls take effect in phase 4, when the relay and the phone app exist."
      >
        <Row label="Relay connection" description="Not connected">
          <button type="button" disabled className={smallSecondaryButtonClass}>
            Reconnect
          </button>
        </Row>
        <Row label="Paired devices" description="None paired">
          <button type="button" disabled className={smallSecondaryButtonClass}>
            Pair a new device
          </button>
        </Row>
        <ToggleRow
          label="Notify the phone when opencode finishes"
          checked={false}
          disabled
          onChange={() => {}}
        />
        <ToggleRow
          label="Show a notice when a file arrives"
          checked={false}
          disabled
          onChange={() => {}}
        />
        <Row label="Received files folder">
          <input
            disabled
            placeholder="Where files from the phone land"
            className={inputClass}
          />
        </Row>
      </Group>
      <DataGroup />
    </div>
  );
}

function GeneralGroup() {
  const closeToTray = useStore((s) => s.settings.closeToTray);
  const startMinimized = useStore((s) => s.settings.startMinimized);
  const theme = useStore((s) => s.settings.theme);
  const setSetting = useStore((s) => s.setSetting);

  return (
    <Group
      title="General"
      note="How Keel behaves when it starts and when you close the window."
    >
      <LaunchAtLoginRow />
      <ToggleRow
        label="Closing the window keeps Keel running in the tray"
        description="Keel keeps running so the launcher shortcut keeps working."
        checked={closeToTray}
        onChange={(next) => void setSetting("closeToTray", next)}
      />
      <ToggleRow
        label="Start with the window minimized"
        description="Keel starts in the tray. The tray icon and the shortcut still work."
        checked={startMinimized}
        onChange={(next) => void setSetting("startMinimized", next)}
      />
      <Row label="Theme">
        <Segmented
          label="Theme"
          options={THEMES}
          value={theme}
          onChange={(next) => void setSetting("theme", next)}
        />
      </Row>
    </Group>
  );
}

/** Lives in the OS, so it is read from the OS rather than from settings. */
function LaunchAtLoginRow() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void isEnabled()
      .then(setOn)
      // Saying "off" silently would be a guess; say what went wrong instead.
      .catch((e: unknown) =>
        setError(`Could not read startup status: ${errorMessage(e)}.`),
      );
  }, []);

  const change = async (next: boolean) => {
    setOn(next);
    setError(null);
    try {
      if (next) await enable();
      else await disable();
    } catch (e) {
      setOn(!next);
      setError(
        `Could not change startup: ${errorMessage(e)}. Check the Startup apps list.`,
      );
    }
  };

  return (
    <ToggleRow
      label="Launch at login"
      description={error ?? "Starts Keel when you sign in."}
      checked={on}
      onChange={(next) => void change(next)}
    />
  );
}

function LauncherGroup() {
  const shortcut = useStore((s) => s.settings.launcherShortcut);
  const closeAfterCommand = useStore((s) => s.settings.closeAfterCommand);
  const defaultTodoList = useStore((s) => s.settings.defaultTodoList);
  const disabledCommands = useStore((s) => s.settings.disabledCommands);
  const lists = useStore((s) => s.lists);
  const setSetting = useStore((s) => s.setSetting);

  // A deleted list must not leave the select blank: show what /todo does now.
  const effectiveList = lists.some((l) => l.id === defaultTodoList)
    ? defaultTodoList
    : INBOX_ID;

  return (
    <Group
      title="Launcher"
      note="The launcher is the small window that opens over whatever you are doing."
    >
      <ShortcutRow shortcut={shortcut} />
      <ToggleRow
        label="Close the launcher after a command runs"
        checked={closeAfterCommand}
        onChange={(next) => void setSetting("closeAfterCommand", next)}
      />
      <Row
        label="Default list for /todo"
        description="Where /todo sends what you type."
      >
        <select
          value={effectiveList}
          onChange={(e) => void setSetting("defaultTodoList", e.target.value)}
          aria-label="Default list for /todo"
          className={inputClass}
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </Row>
      {commands.map((c) => (
        <ToggleRow
          key={c.trigger}
          label={c.trigger}
          description={c.description}
          checked={!disabledCommands.includes(c.trigger)}
          onChange={(next) =>
            void setSetting(
              "disabledCommands",
              next
                ? disabledCommands.filter((t) => t !== c.trigger)
                : [...disabledCommands, c.trigger],
            )
          }
        />
      ))}
    </Group>
  );
}

/** Changing the shortcut is a two-step: name the key, then it registers. */
function ShortcutRow({ shortcut }: { shortcut: string }) {
  const setSetting = useStore((s) => s.setSetting);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shortcut);
  const [note, setNote] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (!next) return;
    setNote(null);
    try {
      await setSetting("launcherShortcut", next);
      setEditing(false);
      // Rust may have had to fall back; the store holds what registered.
      const registered = useStore.getState().settings.launcherShortcut;
      if (registered !== next) {
        setNote(
          `Another app owns ${next}, so Keel uses ${registered} instead.`,
        );
      }
    } catch (error) {
      // Stay in the editor so the value typed is still there to correct.
      setNote(`Could not change the shortcut: ${errorMessage(error)}.`);
    }
  };

  return (
    <Row
      label="Shortcut"
      description={note ?? "Opens the launcher from anywhere."}
    >
      {editing ? (
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="New shortcut"
            className={inputClass}
          />
          <button type="submit" className={smallPrimaryButtonClass}>
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(shortcut);
              setEditing(false);
            }}
            className={smallSecondaryButtonClass}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <kbd className="rounded-[5px] border border-hairline px-1.5 py-0.5 font-mono text-xs text-muted">
            {shortcut.split("+").join(" ")}
          </kbd>
          <button
            type="button"
            onClick={() => {
              setDraft(shortcut);
              setEditing(true);
            }}
            className={smallSecondaryButtonClass}
          >
            Change
          </button>
        </>
      )}
    </Row>
  );
}

function TweaksGroup() {
  const accent = useStore((s) => s.settings.accent);
  const setSetting = useStore((s) => s.setSetting);

  return (
    <Group title="Tweaks" note="Small changes to how Keel looks.">
      <Row label="Accent color" description="Used for status, focus and links.">
        <Segmented
          label="Accent color"
          options={[
            { id: "indigo", label: "Indigo" },
            { id: "teal", label: "Teal" },
            { id: "orange", label: "Orange" },
          ]}
          value={accent}
          onChange={(next) => void setSetting("accent", next)}
        />
      </Row>
    </Group>
  );
}

function DataGroup() {
  const refresh = useStore((s) => s.refresh);
  const open = useStore((s) => s.open);
  const [dbPath, setDbPath] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    void appDataDir()
      .then(async (dir) => setDbPath(await join(dir, "workspace.db")))
      .catch((e: unknown) =>
        setDbPath(`Could not read it: ${errorMessage(e)}`),
      );
  }, []);

  // Every action starts from a clean line, so a message never outlives the
  // thing it describes.
  const clearStatus = () => {
    setNotice(null);
    setError(null);
  };

  const exportTo = async () => {
    clearStatus();
    try {
      const path = await saveDialog({
        title: "Export Keel data",
        defaultPath: "keel-export.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return;
      await writeTextFile(path, JSON.stringify(await exportData(), null, 2));
      setNotice(`Exported to ${path}`);
    } catch (e) {
      setError(`Could not export: ${errorMessage(e)}`);
    }
  };

  const importFrom = async () => {
    clearStatus();
    try {
      const picked = await openDialog({
        title: "Import Keel data",
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!picked || Array.isArray(picked)) return;
      const result = parseBackup(await readTextFile(picked));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await importData(result.data);
      await refresh();
      setNotice("Imported. Items already here were skipped.");
    } catch (e) {
      setError(`Could not import: ${errorMessage(e)}`);
    }
  };

  const reset = async () => {
    setArmed(false);
    clearStatus();
    try {
      await resetAllData();
      await refresh();
      await open({ type: "daily" });
      setNotice("All projects, issues and todos are gone.");
    } catch (e) {
      setError(`Could not reset: ${errorMessage(e)}`);
    }
  };

  const openLogs = async () => {
    clearStatus();
    try {
      await revealItemInDir(await appLogDir());
    } catch (e) {
      setError(`Could not open the logs folder: ${errorMessage(e)}`);
    }
  };

  const status = error ?? notice;

  return (
    <>
      <Group title="Data and About">
        <Row label="Database" description={dbPath || "Reading the location"}>
          <button
            type="button"
            onClick={openLogs}
            className={smallSecondaryButtonClass}
          >
            Open logs folder
          </button>
        </Row>
        <Row
          label="Export and import"
          description="Export writes a file with your projects, issues and todos. Import adds what the file holds."
        >
          <button
            type="button"
            onClick={() => void exportTo()}
            className={smallSecondaryButtonClass}
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => void importFrom()}
            className={smallSecondaryButtonClass}
          >
            Import
          </button>
        </Row>
        <Row
          label="Reset all data"
          description="Empties every project, issue and todo."
        >
          <button
            type="button"
            onClick={() => {
              if (armed) void reset();
              else setArmed(true);
            }}
            onBlur={() => setArmed(false)}
            className={
              armed ? smallDangerButtonClass : smallSecondaryButtonClass
            }
          >
            {armed ? "Reset everything?" : "Reset all data"}
          </button>
        </Row>
        <Row
          label="Version"
          description="Updates arrive with the release build in phase 5."
        >
          <span className="font-mono text-xs text-muted">{version}</span>
        </Row>
      </Group>
      {/* Export, import, reset and the logs button all report here, rather than
          each claiming a row that belongs to a different action. */}
      {status && (
        <p
          role={error ? "alert" : "status"}
          className={`text-sm ${error ? "text-danger" : "text-muted"}`}
        >
          {status}
        </p>
      )}
    </>
  );
}

/* Primitives */

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      <div className="flex flex-col divide-y divide-hairline rounded-[14px] border border-hairline bg-surface">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm">{label}</span>
        {description && (
          <span className="text-xs text-muted">{description}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Row label={label} description={description}>
      <Toggle
        checked={checked}
        label={label}
        disabled={disabled}
        onChange={onChange}
      />
    </Row>
  );
}
