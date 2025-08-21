export type TaskItem = { type: string; title: string };

export function cleanItems(items: TaskItem[]): TaskItem[] {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  const seen: string[] = [];
  const keep: TaskItem[] = [];

  for (const it of items) {
    const t = norm(it.title);
    if (t.split(" ").length < 3) continue;      // drop super-short junk
    if (seen.some(s => isOverlapHigh(s, t))) continue;
    seen.push(t);
    keep.push(it);
  }
  return keep;
}

function isOverlapHigh(a: string, b: string) {
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  const inter = [...A].filter(w => B.has(w)).length;
  const ratio = inter / Math.min(A.size, B.size);
  return ratio >= 0.75 || a.includes(b) || b.includes(a);
}
