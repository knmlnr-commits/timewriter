import "server-only";

import { randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { Bonnetje } from "@/lib/types";

function monthKey(datum: string): string {
  return datum.slice(0, 7);
}

export async function listBonnetjes(
  uid: string,
  opts: { from?: string; to?: string } = {}
): Promise<Bonnetje[]> {
  const kv = getKv();
  const ids = await kv.smembers(KEYS.bonnetjesIndex(uid));
  if (ids.length === 0) return [];
  const rows = await kv.mget<Bonnetje>(...ids.map((id) => KEYS.bonnetje(uid, id)));
  const filtered = rows.filter((r): r is Bonnetje => {
    if (!r) return false;
    if (opts.from && r.datum < opts.from) return false;
    if (opts.to && r.datum > opts.to) return false;
    return true;
  });
  return filtered.sort((a, b) => (a.datum < b.datum ? 1 : -1));
}

export async function getBonnetje(uid: string, id: string): Promise<Bonnetje | null> {
  return getKv().get<Bonnetje>(KEYS.bonnetje(uid, id));
}

export async function createBonnetje(
  uid: string,
  input: Omit<Bonnetje, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Bonnetje> {
  const kv = getKv();
  const id = randomUUID();
  const now = new Date().toISOString();
  const row: Bonnetje = { ...input, id, user_id: uid, created_at: now, updated_at: now };
  await kv.set(KEYS.bonnetje(uid, id), row);
  await kv.sadd(KEYS.bonnetjesIndex(uid), id);
  await kv.sadd(KEYS.bonnetjesByMonth(uid, monthKey(row.datum)), id);
  return row;
}

export async function updateBonnetje(
  uid: string,
  id: string,
  patch: Partial<Bonnetje>
): Promise<Bonnetje> {
  const kv = getKv();
  const existing = await kv.get<Bonnetje>(KEYS.bonnetje(uid, id));
  if (!existing) throw new Error("Bonnetje niet gevonden.");
  const next: Bonnetje = {
    ...existing,
    ...patch,
    id: existing.id,
    user_id: uid,
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.bonnetje(uid, id), next);
  if (existing.datum !== next.datum) {
    await kv.srem(KEYS.bonnetjesByMonth(uid, monthKey(existing.datum)), id);
    await kv.sadd(KEYS.bonnetjesByMonth(uid, monthKey(next.datum)), id);
  }
  return next;
}

export async function deleteBonnetje(uid: string, id: string): Promise<void> {
  const kv = getKv();
  const existing = await kv.get<Bonnetje>(KEYS.bonnetje(uid, id));
  if (!existing) return;
  await kv.del(KEYS.bonnetje(uid, id));
  await kv.srem(KEYS.bonnetjesIndex(uid), id);
  await kv.srem(KEYS.bonnetjesByMonth(uid, monthKey(existing.datum)), id);
}
