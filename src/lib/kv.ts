/**
 * Dual-driver KV with localStorage-fallback signal.
 *
 *  - REDIS_URL          → native redis client (self-host, server-side)
 *  - KV_REST_API_URL +  → @upstash/redis REST client (Vercel KV, Upstash)
 *    KV_REST_API_TOKEN
 *  - neither            → kv is "absent"; callers must surface 503 and the
 *                         frontend falls back to localStorage demo mode.
 *
 * No ORM, no schema. All multi-tenant scoping happens through key prefixes.
 * See KEYS in lib/keys.ts.
 */

import "server-only";

export type KvDriver = "redis" | "rest" | "absent";

export interface Kv {
  driver: KvDriver;
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<boolean>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean; withScores?: boolean }
  ): Promise<string[]>;
  zrangeByScore(key: string, min: number, max: number): Promise<string[]>;
  keys(pattern: string): Promise<string[]>;
  mget<T = unknown>(...keys: string[]): Promise<(T | null)[]>;
}

let cached: Kv | null = null;

function jsonOrRaw<T>(v: unknown): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }
  return v as T;
}

function makeRestDriver(): Kv {
  // Lazy import to avoid pulling Upstash into bundles that don't need it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  const r = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
  return {
    driver: "rest",
    async get(key) {
      return (await r.get(key)) as never;
    },
    async set(key, value, opts) {
      const payload = typeof value === "string" ? value : JSON.stringify(value);
      if (opts?.ex) {
        await r.set(key, payload, { ex: opts.ex });
      } else {
        await r.set(key, payload);
      }
    },
    async del(...keys) {
      if (keys.length === 0) return 0;
      return (await r.del(...keys)) as number;
    },
    async incr(key) {
      return (await r.incr(key)) as number;
    },
    async expire(key, seconds) {
      await r.expire(key, seconds);
    },
    async sadd(key, ...members) {
      if (members.length === 0) return 0;
      return (await r.sadd(key, members[0], ...members.slice(1))) as number;
    },
    async srem(key, ...members) {
      if (members.length === 0) return 0;
      return (await r.srem(key, members[0], ...members.slice(1))) as number;
    },
    async smembers(key) {
      return (await r.smembers(key)) as string[];
    },
    async sismember(key, member) {
      const v = (await r.sismember(key, member)) as number;
      return v === 1;
    },
    async zadd(key, score, member) {
      return ((await r.zadd(key, { score, member })) as number) ?? 0;
    },
    async zrem(key, ...members) {
      if (members.length === 0) return 0;
      return (await r.zrem(key, members[0], ...members.slice(1))) as number;
    },
    async zrange(key, start, stop, opts) {
      const args: Parameters<typeof r.zrange>[3] = {};
      if (opts?.rev) args.rev = true;
      if (opts?.withScores) args.withScores = true;
      return (await r.zrange(key, start, stop, args)) as string[];
    },
    async zrangeByScore(key, min, max) {
      return (await r.zrange(key, min, max, { byScore: true })) as string[];
    },
    async keys(pattern) {
      return (await r.keys(pattern)) as string[];
    },
    async mget<T>(...keys: string[]) {
      if (keys.length === 0) return [];
      return (await r.mget<T[]>(...keys)) as (T | null)[];
    },
  };
}

function makeRedisDriver(): Kv {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("redis") as typeof import("redis");
  const client = createClient({ url: process.env.REDIS_URL! });
  let connectPromise: Promise<unknown> | null = null;
  const ready = () => {
    if (!connectPromise) connectPromise = client.connect();
    return connectPromise;
  };
  return {
    driver: "redis",
    async get(key) {
      await ready();
      const v = await client.get(key);
      return jsonOrRaw(v) as never;
    },
    async set(key, value, opts) {
      await ready();
      const payload = typeof value === "string" ? value : JSON.stringify(value);
      if (opts?.ex) await client.set(key, payload, { EX: opts.ex });
      else await client.set(key, payload);
    },
    async del(...keys) {
      if (keys.length === 0) return 0;
      await ready();
      return Number(await client.del(keys));
    },
    async incr(key) {
      await ready();
      return Number(await client.incr(key));
    },
    async expire(key, seconds) {
      await ready();
      await client.expire(key, seconds);
    },
    async sadd(key, ...members) {
      if (members.length === 0) return 0;
      await ready();
      return Number(await client.sAdd(key, members));
    },
    async srem(key, ...members) {
      if (members.length === 0) return 0;
      await ready();
      return Number(await client.sRem(key, members));
    },
    async smembers(key) {
      await ready();
      return (await client.sMembers(key)) as string[];
    },
    async sismember(key, member) {
      await ready();
      return Boolean(await client.sIsMember(key, member));
    },
    async zadd(key, score, member) {
      await ready();
      return Number(await client.zAdd(key, { score, value: member }));
    },
    async zrem(key, ...members) {
      if (members.length === 0) return 0;
      await ready();
      return Number(await client.zRem(key, members));
    },
    async zrange(key, start, stop, opts) {
      await ready();
      if (opts?.rev) {
        return (await client.zRange(key, start, stop, { REV: true })) as string[];
      }
      return (await client.zRange(key, start, stop)) as string[];
    },
    async zrangeByScore(key, min, max) {
      await ready();
      return (await client.zRangeByScore(key, min, max)) as string[];
    },
    async keys(pattern) {
      await ready();
      return (await client.keys(pattern)) as string[];
    },
    async mget<T>(...keys: string[]) {
      if (keys.length === 0) return [];
      await ready();
      const raw = (await client.mGet(keys)) as (string | null)[];
      return raw.map((v) => jsonOrRaw<T>(v));
    },
  };
}

export function getKv(): Kv {
  if (cached) return cached;
  if (process.env.REDIS_URL) {
    cached = makeRedisDriver();
  } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    cached = makeRestDriver();
  } else {
    cached = absentDriver();
  }
  return cached;
}

function absentDriver(): Kv {
  const err = () => {
    throw new KvAbsentError();
  };
  return {
    driver: "absent",
    async get() {
      return null;
    },
    async set() {
      err();
    },
    async del() {
      err();
      return 0;
    },
    async incr() {
      err();
      return 0;
    },
    async expire() {
      err();
    },
    async sadd() {
      err();
      return 0;
    },
    async srem() {
      err();
      return 0;
    },
    async smembers() {
      return [];
    },
    async sismember() {
      return false;
    },
    async zadd() {
      err();
      return 0;
    },
    async zrem() {
      err();
      return 0;
    },
    async zrange() {
      return [];
    },
    async zrangeByScore() {
      return [];
    },
    async keys() {
      return [];
    },
    async mget() {
      return [];
    },
  };
}

export class KvAbsentError extends Error {
  constructor() {
    super("KV is not configured. Set REDIS_URL or KV_REST_API_URL + KV_REST_API_TOKEN.");
    this.name = "KvAbsentError";
  }
}

export function isKvConfigured(): boolean {
  return getKv().driver !== "absent";
}
