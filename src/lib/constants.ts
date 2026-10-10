export const STATUSES = [
  { id: "backlog", label: "Backlog", tone: "text-stone-400" },
  { id: "todo", label: "Todo", tone: "text-stone-500" },
  { id: "in_progress", label: "In progress", tone: "text-amber-500" },
  { id: "done", label: "Done", tone: "text-indigo-600" },
  { id: "canceled", label: "Canceled", tone: "text-stone-400" },
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
