import { prompt } from "./prompt";
import { todo } from "./todo";
import type { Command } from "./types";

export type { Command, CommandResult } from "./types";

/** One file per command; adding a command means adding a file and a line here. */
export const commands: Command[] = [todo, prompt];
