import { type FormEvent, useState } from "react";
import { IssueRow } from "../components/IssueRow";
import { STATUSES } from "../lib/constants";
import { addInputClass } from "../lib/styles";
import { useStore } from "../store";
import { IssueModal } from "./IssueModal";

export function IssuesView() {
  const view = useStore((s) => s.view);
  const projects = useStore((s) => s.projects);
  const issues = useStore((s) => s.issues);
  const addIssue = useStore((s) => s.addIssue);
  const patchIssue = useStore((s) => s.patchIssue);
  const removeIssue = useStore((s) => s.removeIssue);
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const project =
    view?.type === "issues"
      ? projects.find((p) => p.id === view.projectId)
      : undefined;
  if (!project) return null;

  const openIssue = openId
    ? (issues.find((i) => i.id === openId) ?? null)
    : null;

  const groups = STATUSES.map((s) => ({
    ...s,
    items: issues.filter((i) => i.status === s.id),
  })).filter((g) => g.items.length > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle("");
    await addIssue(t);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <form onSubmit={submit}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add an issue and press Enter"
            aria-label="New issue title"
            className={addInputClass}
          />
        </form>
      </header>

      {groups.length === 0 && (
        <p className="text-sm text-muted">
          No issues yet. Add the first one above.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-1">
          <h2 className="px-2 text-sm font-medium text-muted">
            {g.label} <span className="font-normal">{g.items.length}</span>
          </h2>
          <ul className="flex flex-col">
            {g.items.map((i) => (
              <IssueRow
                key={i.id}
                issue={i}
                projectKey={project.key}
                onOpen={() => setOpenId(i.id)}
              />
            ))}
          </ul>
        </section>
      ))}

      {openIssue && (
        <IssueModal
          issue={openIssue}
          projectKey={project.key}
          onPatch={(patch) => patchIssue(openIssue.id, patch)}
          onDelete={() => {
            removeIssue(openIssue.id);
            setOpenId(null);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
