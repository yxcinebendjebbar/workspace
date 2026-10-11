import { type FormEvent, useState } from "react";
import { DeleteButton } from "../components/DeleteButton";
import { useStore } from "../store";

export function TodosView() {
  const view = useStore((s) => s.view);
  const lists = useStore((s) => s.lists);
  const todos = useStore((s) => s.todos);
  const addTodo = useStore((s) => s.addTodo);
  const setTodoDone = useStore((s) => s.setTodoDone);
  const removeTodo = useStore((s) => s.removeTodo);
  const [title, setTitle] = useState("");

  const list =
    view?.type === "todos"
      ? lists.find((l) => l.id === view.listId)
      : undefined;
  if (!list) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle("");
    await addTodo(t);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
        <form onSubmit={submit}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a todo and press Enter"
            aria-label="New todo"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm placeholder:text-stone-500"
          />
        </form>
      </header>

      {todos.length === 0 && (
        <p className="text-sm text-stone-500">
          Nothing to do here. Add a todo above.
        </p>
      )}

      <ul className="flex flex-col">
        {todos.map((t) => (
          <li
            key={t.id}
            className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-stone-50"
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) => setTodoDone(t.id, e.target.checked)}
              aria-label={`Mark "${t.title}" as ${t.done ? "not done" : "done"}`}
              className="size-4 shrink-0 accent-indigo-600"
            />
            <span
              className={`min-w-0 flex-1 truncate text-sm ${
                t.done ? "text-stone-500 line-through" : ""
              }`}
            >
              {t.title}
            </span>
            <DeleteButton label={t.title} onDelete={() => removeTodo(t.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
