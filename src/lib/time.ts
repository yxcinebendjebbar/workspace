/** How long ago something happened, in words that fit a list row. */
export function since(then: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return ago(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (hours < 24) return ago(hours, "hour");

  const days = Math.round(hours / 24);
  if (days < 30) return ago(days, "day");

  // Past a month the date itself reads better than a growing day count.
  return new Date(then).toLocaleDateString();
}

const ago = (count: number, unit: string) =>
  count === 1 ? `1 ${unit} ago` : `${count} ${unit}s ago`;
