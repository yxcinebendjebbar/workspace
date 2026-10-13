import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { INBOX_ID } from "../db/queries";
import { useStore } from "../store";
import { DeleteButton } from "./DeleteButton";
import { InlineEdit } from "./InlineEdit";

function Section({
  title,
  addLabel,
  placeholder,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  placeholder: string;
  onAdd: (name: string) => Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The inline add input is only rendered while open, so focusing on mount is
  // enough; this is the a11y-friendly stand-in for the autoFocus attribute.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    setValue("");
    setOpen(false);
    await onAdd(name);
  };

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        <button
          type="button"
          aria-label={addLabel}
          onClick={() => setOpen((o) => !o)}
          className="rounded px-1.5 text-muted hover:bg-hover hover:text-ink"
        >
          +
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="px-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-md border border-stone-300 bg-surface px-2 py-1.5 text-sm placeholder:text-muted"
          />
        </form>
      )}
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

function NavRow({
  label,
  hint,
  active,
  editable = true,
  onOpen,
  onRename,
  onDelete,
}: {
  label: string;
  hint?: string;
  active: boolean;
  editable?: boolean;
  onOpen: () => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li
      className={`group flex items-center rounded-md pr-1 ${
        active ? "bg-active" : "hover:bg-hover"
      }`}
    >
      {editing && onRename ? (
        <InlineEdit
          value={label}
          label={`Rename ${label}`}
          className="my-0.5 flex-1"
          onSave={(next) => {
            setEditing(false);
            if (next !== label) onRename(next);
          }}
        />
      ) : (
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={onOpen}
          onDoubleClick={editable ? () => setEditing(true) : undefined}
          title={editable ? `Double-click to rename ${label}` : label}
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
        >
          <span className="truncate">{label}</span>
          {hint && <span className="shrink-0 text-xs text-muted">{hint}</span>}
        </button>
      )}
      {onDelete && <DeleteButton label={label} onDelete={onDelete} />}
    </li>
  );
}

/** A row that belongs to a phase that is not built yet. */
function PendingRow({ label, note }: { label: string; note: string }) {
  return (
    <li>
      <button
        type="button"
        aria-disabled="true"
        title={note}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-muted"
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-xs">{note}</span>
      </button>
    </li>
  );
}

/** "Ctrl+Space" reads better as two keys than as one string. */
const shortcutKeys = (shortcut: string) => shortcut.split("+").join(" ");

export function Sidebar() {
  const view = useStore((s) => s.view);
  const projects = useStore((s) => s.projects);
  const lists = useStore((s) => s.lists);
  const shortcut = useStore((s) => s.settings.launcherShortcut);
  const open = useStore((s) => s.open);
  const addProject = useStore((s) => s.addProject);
  const renameProject = useStore((s) => s.renameProject);
  const removeProject = useStore((s) => s.removeProject);
  const addList = useStore((s) => s.addList);
  const renameList = useStore((s) => s.renameList);
  const removeList = useStore((s) => s.removeList);

  return (
    <nav
      aria-label="Workspace"
      className="flex w-60 shrink-0 flex-col gap-6 border-r border-hairline bg-ground px-3 py-5"
    >
      <ul className="flex flex-col">
        <NavRow
          label="Daily"
          active={view?.type === "daily"}
          editable={false}
          onOpen={() => open({ type: "daily" })}
        />
      </ul>

      <Section
        title="Projects"
        addLabel="New project"
        placeholder="Project name"
        onAdd={addProject}
      >
        {projects.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-muted">No projects yet</li>
        )}
        {projects.map((p) => (
          <NavRow
            key={p.id}
            label={p.name}
            hint={p.key}
            active={view?.type === "issues" && view.projectId === p.id}
            onOpen={() => open({ type: "issues", projectId: p.id })}
            onRename={(name) => renameProject(p.id, name)}
            onDelete={() => removeProject(p.id)}
          />
        ))}
      </Section>

      <Section
        title="Todo lists"
        addLabel="New todo list"
        placeholder="List name"
        onAdd={addList}
      >
        {lists.map((l) => (
          <NavRow
            key={l.id}
            label={l.name}
            active={view?.type === "todos" && view.listId === l.id}
            editable={l.id !== INBOX_ID}
            onOpen={() => open({ type: "todos", listId: l.id })}
            onRename={
              l.id === INBOX_ID ? undefined : (name) => renameList(l.id, name)
            }
            onDelete={l.id === INBOX_ID ? undefined : () => removeList(l.id)}
          />
        ))}
      </Section>

      <section className="flex flex-col gap-1">
        <h2 className="px-2 text-sm font-medium text-muted">opencode</h2>
        <ul className="flex flex-col">
          <PendingRow label="Sessions" note="Comes in phase 3" />
        </ul>
      </section>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 px-2 text-xs text-muted">
        <span>Open launcher</span>
        <span className="w-fit rounded-[5px] border border-hairline px-1.5 py-0.5 font-mono">
          {shortcutKeys(shortcut)}
        </span>
      </div>

      <ul className="flex flex-col">
        <NavRow
          label="Settings"
          active={view?.type === "settings"}
          editable={false}
          onOpen={() => open({ type: "settings" })}
        />
        <PendingRow label="Sign in" note="Comes with the phone link" />
      </ul>
    </nav>
  );
}
