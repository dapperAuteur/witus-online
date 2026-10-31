/** "5 min ago", "3 h ago", "12 d ago" for an ISO timestamp (server render time). */
export function ago(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown time";
  const min = Math.max(0, Math.round((now - t) / 60_000));
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
