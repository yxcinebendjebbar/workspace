import { type FormEvent, useState } from "react";
import { TodoRow } from "../components/TodoRow";
import { addInputClass } from "../lib/styles";
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
    await addTodo(list.id, t);
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
            className={addInputClass}
          />
        </form>
      </header>

      {todos.length === 0 && (
        <p className="text-sm text-muted">
          Nothing to do here. Add a todo above.
        </p>
      )}

      <ul className="flex flex-col">
        {todos.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            onDone={(done) => setTodoDone(t.id, done)}
            onDelete={() => removeTodo(t.id)}
          />
        ))}
      </ul>
    </div>
  );
}
