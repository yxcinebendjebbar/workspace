import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { type Command, commands } from "./commands";
import { exactCommand, matchingCommands, parseInput } from "./parse";

/** How long a success line stays up before the launcher hides itself. */
const SUCCESS_HOLD_MS = 900;

type Status = { kind: "ok" | "error"; text: string };

function EnterChip() {
  return (
    <span className="shrink-0 rounded-[5px] border border-stone-200 px-1.5 py-0.5 text-xs text-stone-500">
      Enter
    </span>
  );
}

function CommandRow({
  command,
  active,
  onPick,
}: {
  command: Command;
  active: boolean;
  onPick: (command: Command) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(command)}
      aria-current={active ? "true" : undefined}
      aria-disabled={command.disabled || undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${
        active ? "bg-stone-100" : "hover:bg-stone-50"
      } ${command.disabled ? "opacity-60" : ""}`}
    >
      <code className="shrink-0 font-mono text-sm font-medium text-indigo-600">
        {command.trigger}
      </code>
      <span className="min-w-0 flex-1 truncate text-sm text-stone-700">
        {command.description}
      </span>
      {active && <EnterChip />}
    </button>
  );
}

export function Launcher() {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const input = parseInput(value);
  const matches = matchingCommands(commands, input);
  const activeIndex = matches.length ? selected % matches.length : 0;
  const activeCommand = matches[activeIndex];
  const exact = exactCommand(commands, input);

  const placeholder =
    input.typingArgs && exact
      ? (exact.argHint ?? exact.description)
      : "Type a command, /todo buy milk";

  const hide = async () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = undefined;
    await invoke("hide_launcher");
  };

  const run = async (command: Command, commandArgs: string) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await command.run(commandArgs);
      if (!result.ok) {
        // Errors keep the window open so the message can be acted on.
        setStatus({ kind: "error", text: result.message });
        return;
      }
      setStatus({ kind: "ok", text: result.message });
      hideTimer.current = window.setTimeout(() => void hide(), SUCCESS_HOLD_MS);
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      busy.current = false;
    }
  };

  const pick = (command: Command) => {
    if (busy.current) return;
    // Argument mode: the trigger is complete, so this runs the command.
    if (command.trigger === input.trigger) return void run(command, input.args);
    // Otherwise complete the trigger; the next Enter runs it.
    setValue(`${command.trigger} `);
  };

  const submit = () => {
    if (activeCommand) pick(activeCommand);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      void hide();
      return;
    }
    if (
      matches.length &&
      (event.key === "ArrowDown" || event.key === "ArrowUp")
    ) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : matches.length - 1;
      setSelected((current) => (current + step) % matches.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  // Every open starts clean and focused, whatever was typed before.
  useEffect(() => {
    inputRef.current?.focus();
    const unlisten = listen("launcher-opened", () => {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
      setStatus(null);
      setValue("");
      setSelected(0);
      inputRef.current?.focus();
    });
    return () => {
      void unlisten.then((unlistenEvent) => unlistenEvent());
    };
  }, []);

  const showEmpty =
    value.startsWith("/") && !input.typingArgs && !matches.length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_20px_48px_-16px_rgba(28,28,26,0.28)]">
      <div className="border-b border-stone-200 px-4 py-3.5">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            // A new trigger means a new command list, so start at the top.
            if (parseInput(next).trigger !== input.trigger) setSelected(0);
            setValue(next);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Launcher command"
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent text-[19px] leading-7 caret-indigo-600 placeholder:text-stone-500 focus-visible:outline-none"
        />
      </div>

      {matches.length > 0 && (
        <ul
          aria-label="Commands"
          className="flex flex-col gap-0.5 overflow-y-auto p-1.5"
        >
          {matches.map((command, index) => (
            <li key={command.trigger}>
              <CommandRow
                command={command}
                active={index === activeIndex}
                onPick={pick}
              />
            </li>
          ))}
        </ul>
      )}

      {showEmpty && (
        <p className="px-4 py-3 text-sm text-stone-500">
          No command matches {input.trigger}
        </p>
      )}

      <div className="mt-auto flex items-center gap-3 border-t border-stone-200 px-4 py-2.5">
        {status ? (
          <span
            role="status"
            className={`truncate text-sm ${
              status.kind === "ok" ? "text-stone-700" : "text-red-700"
            }`}
          >
            {status.text}
          </span>
        ) : (
          <span className="text-xs text-stone-500">Esc hides the launcher</span>
        )}
      </div>
    </div>
  );
}
