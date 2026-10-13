import { type FormEvent, useState } from "react";
import { DeleteButton } from "../components/DeleteButton";
import { Dialog } from "../components/Dialog";
import { StatusIcon } from "../components/StatusIcon";
import type { Issue } from "../db/schema";
import {
  PRIORITIES,
  priorityLabel,
  STATUSES,
  statusMeta,
} from "../lib/constants";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../lib/styles";
import type { IssuePatch } from "../store";

/** Dialog fields fill the panel, so the inline field style plus full width. */
const fieldClass = `${inputClass} w-full`;

const fieldLabelClass = "flex flex-col gap-1 text-sm text-muted";

/**
 * One issue, opened from a row. It shows the facts first; "Edit" swaps in the
 * form, and Save is the only thing that writes.
 */
export function IssueModal({
  issue,
  projectKey,
  onPatch,
  onDelete,
  onClose,
}: {
  issue: Issue;
  projectKey: string;
  onPatch: (patch: IssuePatch) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description);
  const [status, setStatus] = useState(issue.status);
  const [priority, setPriority] = useState(issue.priority);
  const meta = statusMeta(issue.status);

  // The form holds a draft so Escape can drop the whole edit at once.
  const save = (e: FormEvent) => {
    e.preventDefault();
    const next = title.trim();
    if (!next) return;
    onPatch({
      title: next,
      description: description.trim(),
      status,
      priority,
    });
    setEditing(false);
  };

  const cancel = () => {
    setTitle(issue.title);
    setDescription(issue.description);
    setStatus(issue.status);
    setPriority(issue.priority);
    setEditing(false);
  };

  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Escape leaves the edit, not the issue.
    if (e.key === "Escape") {
      e.stopPropagation();
      cancel();
    }
  };

  return (
    <Dialog
      title={editing ? "Edit issue" : `${projectKey}-${issue.number}`}
      onClose={onClose}
      footer={
        editing ? (
          <>
            <button
              type="button"
              onClick={cancel}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="issue-edit"
              className={primaryButtonClass}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <DeleteButton
              label={`${projectKey}-${issue.number}`}
              visible
              onDelete={onDelete}
            />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={primaryButtonClass}
            >
              Edit
            </button>
          </>
        )
      }
    >
      {editing ? (
        <form
          id="issue-edit"
          onSubmit={save}
          onKeyDown={onFormKeyDown}
          className="flex flex-col gap-4"
        >
          <label className={fieldLabelClass}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Issue title"
              className={fieldClass}
            />
          </label>
          <label className={fieldLabelClass}>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description"
              aria-label="Issue description"
              rows={6}
              className={`${fieldClass} resize-y`}
            />
          </label>
          <div className="flex gap-4">
            <label className={`${fieldLabelClass} flex-1`}>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Issue status"
                className={fieldClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${fieldLabelClass} flex-1`}>
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                aria-label="Issue priority"
                className={fieldClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className={`flex items-center gap-1.5 ${meta.tone}`}>
              <StatusIcon status={issue.status} />
              {meta.label}
            </span>
            <span>{priorityLabel(issue.priority)}</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            {issue.title}
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-body">
            {issue.description || "No description yet."}
          </p>
        </div>
      )}
    </Dialog>
  );
}
