import type { Command } from "./commands/types";

/** What the user has typed, split into the command part and the argument. */
export interface ParsedInput {
  /** The trigger typed so far, slash included. The whole value when no space yet. */
  trigger: string;
  /** Everything after the first space, verbatim. */
  args: string;
  /** True once a space follows the trigger: the rest of the line is the argument. */
  typingArgs: boolean;
}

export const parseInput = (value: string): ParsedInput => {
  const at = value.indexOf(" ");
  if (at === -1) {
    return { trigger: value, args: "", typingArgs: false };
  }
  return {
    trigger: value.slice(0, at),
    args: value.slice(at + 1),
    typingArgs: true,
  };
};

/** Commands whose trigger starts with what has been typed. Empty while the
 *  argument is being typed, because the list is about picking a command. */
export const matchingCommands = (
  commands: readonly Command[],
  input: ParsedInput,
): Command[] =>
  input.typingArgs || !input.trigger.startsWith("/")
    ? []
    : commands.filter((command) => command.trigger.startsWith(input.trigger));

/** The command whose trigger starts the line, when it is typed in full. */
export const exactCommand = (
  commands: readonly Command[],
  input: ParsedInput,
): Command | undefined =>
  commands.find((command) => command.trigger === input.trigger);
