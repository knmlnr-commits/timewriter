/**
 * Client-side queue voor snel-invoer registraties die buiten dekking worden
 * gemaakt. Bewust localStorage in plaats van IndexedDB: scope is een paar
 * regels, niet honderden, en de API is sync-friendly.
 *
 * Background Sync API zou eleganter zijn maar werkt niet op iOS Safari,
 * dus het zou alleen het Android-pad dekken. We doen het zelf op
 * `online` event en bij elke app-load.
 */

const KEY = "tw:pending-tijden";

export type PendingPayload = {
  project_id: string;
  datum: string;
  uren: string;
  omschrijving: string;
  factureerbaar: "true" | "false";
};

export type PendingItem = {
  id: string;
  payload: PendingPayload;
  queuedAt: number;
};

function safeRead(): PendingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string") : [];
  } catch {
    return [];
  }
}

function safeWrite(items: PendingItem[]) {
  if (typeof window === "undefined") return;
  if (items.length === 0) {
    window.localStorage.removeItem(KEY);
    return;
  }
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueue(payload: PendingPayload): PendingItem {
  const items = safeRead();
  const item: PendingItem = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queuedAt: Date.now(),
  };
  items.push(item);
  safeWrite(items);
  return item;
}

export function peek(): PendingItem[] {
  return safeRead();
}

export function remove(id: string) {
  const items = safeRead().filter((x) => x.id !== id);
  safeWrite(items);
}

export function clear() {
  safeWrite([]);
}

export function count(): number {
  return safeRead().length;
}
