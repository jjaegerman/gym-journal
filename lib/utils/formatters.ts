export function formatDurationSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatPace(minsPerUnit: number, distanceUnit: string | null): string {
  const mins = Math.floor(minsPerUnit);
  const secs = Math.round((minsPerUnit - mins) * 60);
  const unit = distanceUnit === "km" ? "/km" : "/mi";
  return `${mins}:${String(secs).padStart(2, "0")} ${unit}`;
}
