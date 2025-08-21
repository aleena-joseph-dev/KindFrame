type ItemType = "Task" | "To-do" | "Event" | "Note" | "Journal";
type Item = {
  type: ItemType;
  title: string;
  details: string | null;
  due_iso: string | null;
  duration_min: number | null;
  location: string | null;
  subtasks: string[];
};

const ACTION_VERBS = new Set([
  "buy","call","email","message","text","send","follow","pay","book","schedule","renew",
  "fix","update","clean","plan","review","complete","finish","pick","get","go","visit"
]);

function normalizeTitle(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function wordList(s: string) {
  return normalizeTitle(s).split(" ").filter(Boolean);
}

// Keep short items if they look like verb+noun ("call friend", "send mail")
function isVerbNoun(title: string) {
  const w = wordList(title);
  if (w.length < 2) return false;
  return ACTION_VERBS.has(w[0]);
}

// Near-duplicate check using token containment + small delta
function isNearSubset(a: string, b: string) {
  const A = new Set(wordList(a));
  const B = new Set(wordList(b));
  if (A.size === 0 || B.size === 0) return false;

  const short = A.size <= B.size ? A : B;
  const long  = A.size <= B.size ? B : A;

  let contained = 0;
  short.forEach(t => { if (long.has(t)) contained++; });

  const overlap = contained / short.size;
  const extra   = long.size - contained;

  // Treat as near-duplicate only if almost all short tokens are in long
  // and long doesn't add much more (≤2 extra tokens).
  return overlap >= 0.9 && extra <= 2;
}

export function postFilterItems(items: Item[]): Item[] {
  // 1) Expand "X and Y" into two tasks when both parts have a verb
  const expanded: Item[] = [];
  for (const it of items) {
    const parts = it.title.split(/\s+\band\b\s+/i).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      // Keep original too (optional). Here we prefer splitting.
      for (const p of parts) {
        expanded.push({ ...it, title: p });
      }
    } else {
      expanded.push(it);
    }
  }

  // 2) Drop obvious junk: but preserve 2-word verb+noun items
  const keptLength: Item[] = expanded.filter(it => {
    const words = wordList(it.title).length;
    if (words >= 3) return true;
    return isVerbNoun(it.title); // allow "call friend", "send mail", "buy milk"
  });

  // 3) Remove near-duplicates (but NOT disjoint tasks)
  const out: Item[] = [];
  for (const it of keptLength) {
    const already = out.find(o => isNearSubset(o.title, it.title));
    if (!already) out.push(it);
  }

  // 4) Final de-dupe by normalized title
  const seen = new Set<string>();
  const final: Item[] = [];
  for (const it of out) {
    const key = normalizeTitle(it.title);
    if (!seen.has(key)) {
      seen.add(key);
      final.push(it);
    }
  }

  return final.slice(0, 5);
}
