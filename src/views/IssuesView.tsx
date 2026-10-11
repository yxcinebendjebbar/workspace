import { type FormEvent, useState } from "react";
import { DeleteButton } from "../components/DeleteButton";
import { InlineEdit } from "../components/InlineEdit";
import { StatusIcon } from "../components/StatusIcon";
import {
  nextPriority,
  nextStatus,
  priorityLabel,
  STATUSES,
  statusMeta,
} from "../lib/constants";
import { useStore } from "../store";
import { IssueDetail } from "./IssueDetail";

export function IssuesView() {
  const view = useStore((s) => s.view);
  const projects = useStore((s) => s.projects);
  const issues = useStore((s) => s.issues);
  const addIssue = useStore((s) => s.addIssue);
  const patchIssue = useStore((s) => s.patchIssue);
  const removeIssue = useStore((s) => s.removeIssue);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
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
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm placeholder:text-stone-500"
          />
        </form>
      </header>

      {openIssue ? (
        <IssueDetail
          issue={openIssue}
          projectKey={project.key}
          onPatch={(patch) => patchIssue(openIssue.id, patch)}
          onClose={() => setOpenId(null)}
        />
      ) : null}

      {groups.length === 0 && (
        <p className="text-sm text-stone-500">
          No issues yet. Add the first one above.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-1">
          <h2 className="px-2 text-sm font-medium text-stone-500">
            {g.label} <span className="font-normal">{g.items.length}</span>
          </h2>
          <ul className="flex flex-col">
            {g.items.map((i) => {
              const meta = statusMeta(i.status);
              return (
                <li
                  key={i.id}
                  className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-stone-50"
                >
                  <button
                    type="button"
                    title={`${meta.label}. Click to change`}
                    aria-label={`Status: ${meta.label}. Click to change`}
                    onClick={() =>
                      patchIssue(i.id, { status: nextStatus(i.status) })
                    }
                    className={`shrink-0 rounded-full ${meta.tone}`}
                  >
                    <StatusIcon status={i.status} />
                  </button>
                  <span className="w-20 shrink-0 text-sm text-stone-500">
                    {project.key}-{i.number}
                  </span>
                  {editingId === i.id ? (
                    <InlineEdit
                      value={i.title}
                      label="Issue title"
                      onSave={(next) => {
                        patchIssue(i.id, { title: next });
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenId(i.id)}
                      onDoubleClick={() => setEditingId(i.id)}
                      title={i.title}
                      className="min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-left text-sm hover:bg-stone-100"
                    >
                      {i.title}
                    </button>
                  )}
                  <button
                    type="button"
                    title="Click to change priority"
                    onClick={() =>
                      patchIssue(i.id, { priority: nextPriority(i.priority) })
                    }
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs text-stone-600 hover:bg-stone-200 focus-visible:opacity-100 ${
                      i.priority === 0
                        ? "opacity-0 group-hover:opacity-100"
                        : ""
                    }`}
                  >
                    {priorityLabel(i.priority)}
                  </button>
                  <DeleteButton
                    label={i.title}
                    onDelete={() => removeIssue(i.id)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
