import { statusMeta } from "../lib/constants";
import type { OpenCodeSession } from "../opencode/sessions";
import { StatusIcon } from "./StatusIcon";

/** The issue status each session state borrows its shape from. */
function look(session: OpenCodeSession) {
  if (session.status === "running") {
    return { icon: "in_progress", label: "Running" };
  }
  if (session.outcome === "failed") {
    return { icon: "canceled", label: "Failed" };
  }
  if (session.outcome === "interrupted") {
    return { icon: "todo", label: "Interrupted" };
  }
  return { icon: "done", label: "Succeeded" };
}

/**
 * A hairline pill for one session. The shape carries the state and the tone
 * only reinforces it, so the label stays legible in both themes.
 */
export function SessionStatus({ session }: { session: OpenCodeSession }) {
  const { icon, label } = look(session);

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline py-0.5 pl-1.5 pr-2.5 text-xs text-body">
      <span className={statusMeta(icon).tone}>
        <StatusIcon status={icon} />
      </span>
      {label}
    </span>
  );
}
