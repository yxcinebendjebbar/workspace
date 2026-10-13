import type { Issue } from "../db/schema";
import {
  nextPriority,
  nextStatus,
  priorityLabel,
  statusMeta,
} from "../lib/constants";
import { useStore } from "../store";
import { DeleteButton } from "./DeleteButton";
import { StatusIcon } from "./StatusIcon";

/** One issue in a list. The icon steps status, the title opens the modal. */
export function IssueRow({
  issue,
  projectKey,
  onOpen,
}: {
  issue: Issue;
  projectKey: string;
  onOpen: () => void;
}) {
  const patchIssue = useStore((s) => s.patchIssue);
  const removeIssue = useStore((s) => s.removeIssue);
  const meta = statusMeta(issue.status);

  return (
    <li className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-hover">
      <button
        type="button"
        title={`${meta.label}. Click to change`}
        aria-label={`Status: ${meta.label}. Click to change`}
        onClick={() =>
          patchIssue(issue.id, { status: nextStatus(issue.status) })
        }
        className={`shrink-0 rounded-full ${meta.tone}`}
      >
        <StatusIcon status={issue.status} />
      </button>
      <span className="w-20 shrink-0 text-sm text-muted">
        {projectKey}-{issue.number}
      </span>
      <button
        type="button"
        onClick={onOpen}
        title={issue.title}
        className="min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-left text-sm hover:bg-active"
      >
        {issue.title}
      </button>
      <button
        type="button"
        title="Click to change priority"
        onClick={() =>
          patchIssue(issue.id, { priority: nextPriority(issue.priority) })
        }
        className={`shrink-0 rounded px-1.5 py-0.5 text-xs text-muted hover:bg-active focus-visible:opacity-100 ${
          issue.priority === 0 ? "opacity-0 group-hover:opacity-100" : ""
        }`}
      >
        {priorityLabel(issue.priority)}
      </button>
      <DeleteButton
        label={issue.title}
        onDelete={() => removeIssue(issue.id)}
      />
    </li>
  );
}
