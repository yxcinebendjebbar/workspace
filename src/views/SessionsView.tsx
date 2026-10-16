import { useEffect } from "react";
import { SessionStatus } from "../components/SessionStatus";
import { smallSecondaryButtonClass } from "../lib/styles";
import { since } from "../lib/time";
import type { OpenCodeSession } from "../opencode/sessions";
import { useStore } from "../store";

function SessionRow({
  session,
  now,
}: {
  session: OpenCodeSession;
  now: number;
}) {
  const when =
    session.status === "running"
      ? `Started ${since(session.started, now)}`
      : `Finished ${since(session.finished ?? session.started, now)}`;

  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-2">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">{session.title}</span>
        <span className="truncate text-xs text-muted">
          {when} in {session.directory}
        </span>
      </span>
      <SessionStatus session={session} />
    </li>
  );
}

function Group({
  title,
  sessions,
  now,
}: {
  title: string;
  sessions: OpenCodeSession[];
  now: number;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-2 text-sm font-medium text-muted">
        {title} <span className="font-normal">{sessions.length}</span>
      </h2>
      <ul className="flex flex-col">
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} now={now} />
        ))}
      </ul>
    </section>
  );
}

/**
 * What opencode has been asked to do, running sessions first. The list follows
 * the server's event stream, so a session moves here on its own.
 */
export function SessionsView() {
  const sessions = useStore((s) => s.sessions);
  const connected = useStore((s) => s.opencodeConnected);
  const error = useStore((s) => s.opencodeError);
  const directory = useStore((s) => s.settings.opencodeDirectory);
  const watchOpenCode = useStore((s) => s.watchOpenCode);

  useEffect(() => {
    void watchOpenCode();
  }, [watchOpenCode]);

  const now = Date.now();
  const running = sessions.filter((s) => s.status === "running");
  const finished = sessions.filter((s) => s.status !== "running");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted">
          {directory
            ? `What opencode has run in ${directory}.`
            : "What opencode has run anywhere. Set a project folder in Settings to narrow this down."}
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-3">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void watchOpenCode()}
            className={smallSecondaryButtonClass}
          >
            Try again
          </button>
        </div>
      )}

      {running.length > 0 && (
        <Group title="Running" sessions={running} now={now} />
      )}
      {finished.length > 0 && (
        <Group title="Finished" sessions={finished} now={now} />
      )}

      {!error && sessions.length === 0 && (
        <p className="text-sm text-muted">
          {connected
            ? "No sessions yet. Send one with /prompt."
            : "Looking for opencode."}
        </p>
      )}
    </div>
  );
}
