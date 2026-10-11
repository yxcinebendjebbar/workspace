export function StatusIcon({ status }: { status: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {status === "backlog" && (
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 2.4"
        />
      )}
      {status === "todo" && (
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )}
      {status === "in_progress" && (
        <>
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 4a4 4 0 0 1 0 8z" fill="currentColor" />
        </>
      )}
      {status === "done" && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M5 8.2l2 2 4-4.2"
            stroke="#fff"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {status === "canceled" && (
        <>
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5.5 5.5l5 5M10.5 5.5l-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
