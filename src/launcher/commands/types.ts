export type CommandResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export interface Command {
  /** What the user types to call it, slash included, e.g. "/todo". */
  trigger: string;
  /** One-line description shown next to the trigger. */
  description: string;
  /** Placeholder shown once the trigger has been typed and followed by a space. */
  argHint?: string;
  /** Runs with everything after the trigger. */
  run: (args: string) => Promise<CommandResult>;
}
