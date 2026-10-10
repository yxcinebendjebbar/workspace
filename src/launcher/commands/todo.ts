import { emit } from "@tauri-apps/api/event";
import { addTodo, INBOX_ID } from "../../db/queries";
import type { Command } from "./types";

export const todo: Command = {
  trigger: "/todo",
  title: "Add todo",
  description: "Add a todo to Inbox",
  argHint: "What to add",
  async run(args) {
    const title = args.trim();
    if (!title) return { ok: false, message: "Type what to add after /todo" };
    await addTodo(INBOX_ID, title);
    // The main window is another webview with its own store, tell it to reload.
    await emit("data-changed");
    return { ok: true, message: "Added to Inbox" };
  },
};
