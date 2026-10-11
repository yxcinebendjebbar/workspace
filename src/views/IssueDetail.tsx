import { useState } from "react";
import { InlineEdit } from "../components/InlineEdit";
import { StatusIcon } from "../components/StatusIcon";
import type { Issue } from "../db/schema";
import {
  nextPriority,
  nextStatus,
  priorityLabel,
  statusMeta,
} from "../lib/constants";
import type { IssuePatch } from "../store";

// Detail panel for one issue: rename, edit the description, and step status
// and priority. Edits save through the parent's patch handler.
export function IssueDetail({
  issue,
  projectKey,
  onPatch,
  onClose,
}: {
  issue: Issue;
  projectKey: string;
  onPatch: (patch: IssuePatch) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(issue.description);
  const meta = statusMeta(issue.status);

  const commitDescription = () => {
    const next = description.trim();
    if (next !== issue.description) onPatch({ description: next });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Issue detail</h2>
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <span className="w-20 shrink-0">
          {projectKey}-{issue.number}
        </span>
        <button
          type="button"
          onClick={() => onPatch({ status: nextStatus(issue.status) })}
          title="Click to change status"
          className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-stone-100 ${meta.tone}`}
        >
          <StatusIcon status={issue.status} />
          {meta.label}
        </button>
        <button
          type="button"
          onClick={() => onPatch({ priority: nextPriority(issue.priority) })}
          title="Click to change priority"
          className="rounded px-1.5 py-0.5 text-stone-600 hover:bg-stone-100"
        >
          {priorityLabel(issue.priority)}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded px-1.5 py-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          ×
        </button>
      </div>

      <InlineEdit
        value={issue.title}
        label="Issue title"
        className="text-xl font-semibold tracking-tight"
        onSave={(next) => onPatch({ title: next })}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={commitDescription}
        placeholder="Add a description"
        aria-label="Issue description"
        rows={8}
        className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-500"
      />
    </div>
  );
}
