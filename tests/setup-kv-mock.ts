import { vi } from "vitest";

/**
 * In-memory KV that mimics the subset of @/lib/kv we exercise from tests.
 * The repo modules import "server-only" — we strip that and inject this mock
 * via Vitest's module mocking before the SUT loads.
 */

type Mode = "single" | "concurrent";

interface Store {
  values: Map<string, string>;
  sets: Map<string, Set<string>>;
  zsets: Map<string, Map<string, number>>;
  // simulate a small artificial scheduling jitter so genuine races are detectable
  mode: Mode;
}

export function createMemoryKv(mode: Mode = "single") {
  const store: Store = {
    values: new Map(),
    sets: new Map(),
    zsets: new Map(),
    mode,
  };

  async function tick() {
    if (store.mode === "concurrent") {
      // hand control back to the event loop so interleavings can occur
      await new Promise((r) => setImmediate(r));
    }
  }

  function ser(v: unknown): string {
    return typeof v === "string" ? v : JSON.stringify(v);
  }
  function deser<T>(v: string | undefined): T | null {
    if (v === undefined) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }

  const kv = {
    driver: "redis" as const,
    async get<T>(key: string): Promise<T | null> {
      await tick();
      return deser<T>(store.values.get(key));
    },
    async set(key: string, value: unknown) {
      await tick();
      store.values.set(key, ser(value));
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const k of keys) {
        if (store.values.delete(k)) n++;
      }
      return n;
    },
    async incr(key: string) {
      // Critical for the race test: read + write must be atomic, just like
      // Redis INCR. We use a microtask boundary BEFORE reading to expose
      // any non-atomic implementation in callers.
      await tick();
      const current = Number(store.values.get(key) ?? 0);
      const next = current + 1;
      store.values.set(key, String(next));
      return next;
    },
    async expire() {},
    async sadd(key: string, ...members: string[]) {
      await tick();
      const s = store.sets.get(key) ?? new Set<string>();
      let added = 0;
      for (const m of members) {
        if (!s.has(m)) {
          s.add(m);
          added++;
        }
      }
      store.sets.set(key, s);
      return added;
    },
    async srem(key: string, ...members: string[]) {
      const s = store.sets.get(key);
      if (!s) return 0;
      let n = 0;
      for (const m of members) {
        if (s.delete(m)) n++;
      }
      return n;
    },
    async smembers(key: string) {
      return [...(store.sets.get(key) ?? new Set())];
    },
    async sismember(key: string, member: string) {
      return Boolean(store.sets.get(key)?.has(member));
    },
    async zadd(key: string, score: number, member: string) {
      const m = store.zsets.get(key) ?? new Map<string, number>();
      const existed = m.has(member);
      m.set(member, score);
      store.zsets.set(key, m);
      return existed ? 0 : 1;
    },
    async zrem(key: string, ...members: string[]) {
      const m = store.zsets.get(key);
      if (!m) return 0;
      let n = 0;
      for (const mm of members) {
        if (m.delete(mm)) n++;
      }
      return n;
    },
    async zrange(key: string, start: number, stop: number, opts?: { rev?: boolean }) {
      const m = store.zsets.get(key);
      if (!m) return [];
      const list = [...m.entries()].sort((a, b) => a[1] - b[1]);
      if (opts?.rev) list.reverse();
      return list.slice(start, stop === -1 ? undefined : stop + 1).map(([k]) => k);
    },
    async zrangeByScore(key: string, min: number, max: number) {
      const m = store.zsets.get(key);
      if (!m) return [];
      return [...m.entries()]
        .filter(([, score]) => score >= min && score <= max)
        .sort((a, b) => a[1] - b[1])
        .map(([k]) => k);
    },
    async keys(pattern: string) {
      const rx = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
      return [...store.values.keys()].filter((k) => rx.test(k));
    },
    async mget<T>(...keys: string[]) {
      return keys.map((k) => deser<T>(store.values.get(k)));
    },
  };

  return { kv, store };
}

export function installKvMock(mode: Mode = "single") {
  const { kv, store } = createMemoryKv(mode);
  vi.doMock("@/lib/kv", () => ({
    getKv: () => kv,
    isKvConfigured: () => true,
  }));
  vi.doMock("server-only", () => ({}));
  return { kv, store };
}
