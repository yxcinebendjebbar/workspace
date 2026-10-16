import { emit } from "@tauri-apps/api/event";
import { errorMessage } from "../../lib/errors";
import { getSettings } from "../../lib/settings";
import { opencode } from "../../opencode/client";
import type { Command } from "./types";

export const prompt: Command = {
  trigger: "/prompt",
  title: "Prompt",
  description: "Send to opencode",
  argHint: "What to ask opencode",
  async run(args) {
    const text = args.trim();
    if (!text)
      return { ok: false, message: "Type what to send after /prompt." };

    const { opencodeDirectory: directory, opencodeServerUrl } =
      await getSettings();
    if (!directory) {
      return {
        ok: false,
        message: "Choose a project folder in Settings, then send again.",
      };
    }

    const result = await opencode(opencodeServerUrl);
    if (!result.ok) return { ok: false, message: result.message };

    try {
      const client = result.client;
      // Continue the newest session in this folder: opencode keeps its
      // context, so a follow-up lands where the last one left off.
      const listed = await client.session.list({
        limit: 1,
        order: "desc",
        directory,
      });
      const session =
        listed.data[0] ??
        (await client.session.create({ location: { directory } }));
      await client.session.prompt({ sessionID: session.id, text });

      // The main window shows sessions too; tell it to reread them.
      await emit("data-changed");
      return { ok: true, message: "Sent to opencode" };
    } catch (error) {
      return {
        ok: false,
        message: `The prompt did not reach opencode (${errorMessage(error)}).`,
      };
    }
  },
};
