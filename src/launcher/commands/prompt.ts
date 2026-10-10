import type { Command } from "./types";

/** Placeholder so the shape of a second command is visible from day one. */
export const prompt: Command = {
  trigger: "/prompt",
  title: "Prompt",
  description: "Coming in phase 3",
  disabled: true,
  async run() {
    return { ok: false, message: "Coming in phase 3" };
  },
};
