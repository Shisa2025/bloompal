export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatReactionTime(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function activityLabel(value: string) {
  if (value === "watering") return "Watering";
  if (value === "collect_bugs") return "Collect Bugs";
  if (value === "snapshot") return "Snapshot";
  if (value === "catch_fish") return "Catching fishes";
  if (value === "pluck_fruit") return "Fruit Plucking";
  return value;
}
