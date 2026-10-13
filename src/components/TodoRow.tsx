import type { Todo } from "../db/schema";
import { DeleteButton } from "./DeleteButton";

/** One todo: a checkbox, the title, and an armed delete. */
export function TodoRow({
  todo,
  onDone,
  onDelete,
}: {
  todo: Todo;
  onDone: (done: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-hover">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={(e) => onDone(e.target.checked)}
        aria-label={`Mark "${todo.title}" as ${todo.done ? "not done" : "done"}`}
        className="size-4 shrink-0 accent-accent"
      />
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          todo.done ? "text-muted line-through" : ""
        }`}
      >
        {todo.title}
      </span>
      <DeleteButton label={todo.title} onDelete={onDelete} />
    </li>
  );
}
