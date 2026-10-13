import { emit } from "@tauri-apps/api/event";
import { addTodo, INBOX_ID, listTodoLists } from "../../db/queries";
import { getSettings } from "../../lib/settings";
import type { Command } from "./types";

export const todo: Command = {
  trigger: "/todo",
  title: "Add todo",
  description: "Add a todo",
  argHint: "What to add",
  async run(args) {
    const title = args.trim();
    if (!title) return { ok: false, message: "Type what to add after /todo." };
    const [lists, { defaultTodoList }] = await Promise.all([
      listTodoLists(),
      getSettings(),
    ]);
    // The configured list wins unless it has since been deleted.
    const list = lists.find((l) => l.id === defaultTodoList);
    await addTodo(list?.id ?? INBOX_ID, title);
    // The main window is another webview with its own store, tell it to reload.
    await emit("data-changed");
    return {
      ok: true,
      message: list ? `Added to ${list.name}` : "Added to Inbox",
    };
  },
};
