export const STATUSES = [
  { id: "backlog", label: "Backlog", tone: "text-muted/70" },
  { id: "todo", label: "Todo", tone: "text-muted" },
  { id: "in_progress", label: "In progress", tone: "text-warn" },
  { id: "done", label: "Done", tone: "text-accent" },
  { id: "canceled", label: "Canceled", tone: "text-muted" },
] as const;

export const PRIORITIES = [
  { id: 0, label: "No priority" },
  { id: 1, label: "Urgent" },
  { id: 2, label: "High" },
  { id: 3, label: "Medium" },
  { id: 4, label: "Low" },
] as const;

export const statusMeta = (id: string) =>
  STATUSES.find((s) => s.id === id) ?? STATUSES[1];

export const nextStatus = (id: string) => {
  const i = STATUSES.findIndex((s) => s.id === id);
  return STATUSES[(i + 1) % STATUSES.length].id;
};

export const nextPriority = (p: number) => (p + 1) % PRIORITIES.length;

export const priorityLabel = (p: number) =>
  PRIORITIES.find((x) => x.id === p)?.label ?? PRIORITIES[0].label;
