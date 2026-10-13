import { type FormEvent, useState } from "react";
import { IssueRow } from "../components/IssueRow";
import { TodoRow } from "../components/TodoRow";
import { INBOX_ID } from "../db/queries";
import { addInputClass } from "../lib/styles";
import { useStore } from "../store";
import { IssueModal } from "./IssueModal";

/**
 * The home screen: what is open right now. With no project yet it doubles as
 * the first-launch screen.
 */
export function DailyView() {
  const projects = useStore((s) => s.projects);
  const dailyIssues = useStore((s) => s.dailyIssues);
  const patchIssue = useStore((s) => s.patchIssue);
  const removeIssue = useStore((s) => s.removeIssue);
  const [openId, setOpenId] = useState<string | null>(null);

  if (projects.length === 0) return <FirstLaunch />;

  const openIssue = dailyIssues.find((i) => i.id === openId) ?? null;

  return (
    <>
      <Daily onOpenIssue={setOpenId} />
      {openIssue && (
        <IssueModal
          issue={openIssue}
          projectKey={openIssue.projectKey}
          onPatch={(patch) => void patchIssue(openIssue.id, patch)}
          onDelete={() => {
            void removeIssue(openIssue.id);
            setOpenId(null);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

/** Quick add at the top, then the two lists that make up the day. */
function Daily({ onOpenIssue }: { onOpenIssue: (id: string) => void }) {
  const shortcut = useStore((s) => s.settings.launcherShortcut);
  const dailyTodos = useStore((s) => s.dailyTodos);
  const dailyIssues = useStore((s) => s.dailyIssues);
  const addTodo = useStore((s) => s.addTodo);
  const setTodoDone = useStore((s) => s.setTodoDone);
  const removeTodo = useStore((s) => s.removeTodo);
  const [title, setTitle] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle("");
    await addTodo(INBOX_ID, t);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Daily</h1>
        <form onSubmit={submit}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a todo to Inbox and press Enter"
            aria-label="New Inbox todo"
            className={addInputClass}
          />
        </form>
      </header>

      <section className="flex flex-col gap-1">
        <h2 className="px-2 text-sm font-medium text-muted">
          Inbox <span className="font-normal">{dailyTodos.length}</span>
        </h2>
        {dailyTodos.length === 0 ? (
          <p className="px-2 text-sm text-muted">
            Nothing open in the Inbox. Add one above.
          </p>
        ) : (
          <ul className="flex flex-col">
            {dailyTodos.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                onDone={(done) => void setTodoDone(t.id, done)}
                onDelete={() => void removeTodo(t.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="px-2 text-sm font-medium text-muted">
          In progress <span className="font-normal">{dailyIssues.length}</span>
        </h2>
        {dailyIssues.length === 0 ? (
          <p className="px-2 text-sm text-muted">
            Nothing in progress. Set an issue's status in a project.
          </p>
        ) : (
          <ul className="flex flex-col">
            {dailyIssues.map((i) => (
              <IssueRow
                key={i.id}
                issue={i}
                projectKey={i.projectKey}
                onOpen={() => onOpenIssue(i.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="px-2 text-sm text-muted">
        Press {shortcut.split("+").join(" ")} anywhere for the launcher, or type
        /todo followed by what you need to do.
      </p>
    </div>
  );
}

/** First run: one input to start a project, and three things worth knowing. */
function FirstLaunch() {
  const shortcut = useStore((s) => s.settings.launcherShortcut);
  const addProject = useStore((s) => s.addProject);
  const [name, setName] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = name.trim();
    if (!next) return;
    setName("");
    await addProject(next);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Start with a project
        </h1>
        <form onSubmit={submit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name and press Enter"
            aria-label="New project name"
            className={addInputClass}
          />
        </form>
      </header>

      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-body">
        <li>
          Press {shortcut.split("+").join(" ")} anywhere to open the launcher.
        </li>
        <li>Type /todo buy milk to add a todo to your Inbox.</li>
        <li>Click an issue's status icon to change its status.</li>
      </ul>
    </div>
  );
}
