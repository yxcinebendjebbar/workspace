import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useRef, useState } from "react";
import { commands, type Command } from "./commands";

/** How long a success line stays up before the launcher hides itself. */
const SUCCESS_HOLD_MS = 900;

type Status = { kind: "ok" | "error"; text: string };

/** Splits "/todo buy milk" into the trigger typed so far and its argument. */
function parse(value: string): {
  head: string;
  args: string;
  typingArgs: boolean;
} {
  const at = value.indexOf(" ");
  if (at === -1) return { head: value, args: "", typingArgs: false };
  return { head: value.slice(0, at), args: value.slice(at + 1), typingArgs: true };
}

export function Launcher() {
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const busy = useRef(false);

  const { head, args, typingArgs } = parse(value);
  const inCommand = value.startsWith("/");

  // The list offers triggers only while the trigger is being typed; once a
  // space follows it, the rest of the line is the argument.
  const matches = useMemo(
    () =>
      inCommand && !typingArgs
        ? commands.filter((c) => c.trigger.startsWith(head))
        : [],
    [inCommand, typingArgs, head],
  );
  const exact = commands.find((c) => c.trigger === head);
  const picked = matches.length ? matches[selected % matches.length] : undefined;

  const placeholder =
    typingArgs && exact
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
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      busy.current = false;
    }
  };

  const submit = () => {
    if (busy.current) return;
    // Argument mode: run the command whose trigger starts the line.
    if (typingArgs && exact) return void run(exact, args);
    if (!picked) return;
    if (picked.trigger === head) return void run(picked, "");
    // Partial trigger: complete it, the next Enter runs the command.
    setValue(`${picked.trigger} `);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      void hide();
      return;
    }
    if (matches.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setSelected(
        (s) => (s + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
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
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => setSelected(0), [head]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_18px_50px_-12px_rgba(28,28,26,0.35)]">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Launcher command"
        spellCheck={false}
        autoComplete="off"
        className="w-full border-b border-stone-200 bg-transparent px-4 py-3 text-sm placeholder:text-stone-400 focus-visible:outline-none"
      />

      {matches.length > 0 && (
        <ul aria-label="Commands" className="flex flex-col gap-0.5 overflow-y-auto p-1.5">
          {matches.map((c, i) => (
            <li key={c.trigger}>
              <button
                type="button"
                onClick={() =>
                  c.trigger === head ? submit() : setValue(`${c.trigger} `)
                }
                aria-current={i === selected % matches.length ? "true" : undefined}
                className={`flex w-full items-baseline gap-3 rounded-md px-2.5 py-1.5 text-left ${
                  i === selected % matches.length
                    ? "bg-stone-200/70"
                    : "hover:bg-stone-200/40"
                } ${c.disabled ? "opacity-60" : ""}`}
              >
                <code className="shrink-0 text-sm font-medium">{c.trigger}</code>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm">{c.title}</span>
                  <span className="truncate text-xs text-stone-500">
                    {c.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-stone-200 px-4 py-2">
        {status ? (
          <span
            role="status"
            className={`truncate text-sm ${
              status.kind === "ok" ? "text-stone-600" : "text-red-600"
            }`}
          >
            {status.text}
          </span>
        ) : (
          <span className="text-xs text-stone-400">
            ↑↓ pick a command, Enter run, Esc hide
          </span>
        )}
        <span className="shrink-0 text-xs text-stone-400">Ctrl+Space</span>
      </div>
    </div>
  );
}
