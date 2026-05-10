import "server-only";

import { randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { Tijdsregistratie } from "@/lib/types";

function monthKey(datum: string): string {
  return datum.slice(0, 7);
}

function dateScore(datum: string): number {
  // ms epoch of date midnight UTC; works as a sortable score
  return new Date(`${datum}T00:00:00Z`).getTime();
}

export async function listTijden(
  uid: string,
  opts: { from?: string; to?: string; projectId?: string } = {}
): Promise<Tijdsregistratie[]> {
  const kv = getKv();
  let ids: string[];
  if (opts.projectId) {
    ids = await kv.smembers(KEYS.tijdenByProject(uid, opts.projectId));
  } else if (opts.from && opts.to) {
    ids = await kv.zrangeByScore(KEYS.tijdenByDate(uid), dateScore(opts.from), dateScore(opts.to));
  } else {
    ids = await kv.smembers(KEYS.tijdenIndex(uid));
  }
  if (ids.length === 0) return [];
  const rows = await kv.mget<Tijdsregistratie>(...ids.map((id) => KEYS.tijd(uid, id)));
  const filtered = rows.filter((r): r is Tijdsregistratie => {
    if (!r) return false;
    if (opts.from && r.datum < opts.from) return false;
    if (opts.to && r.datum > opts.to) return false;
    if (opts.projectId && r.project_id !== opts.projectId) return false;
    return true;
  });
  return filtered.sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));
}

export async function getTijd(uid: string, id: string): Promise<Tijdsregistratie | null> {
  return getKv().get<Tijdsregistratie>(KEYS.tijd(uid, id));
}

export async function createTijd(
  uid: string,
  input: Omit<Tijdsregistratie, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Tijdsregistratie> {
  const kv = getKv();

  if (input.bron !== "handmatig" && input.bron_ref) {
    const existing = await kv.get<string>(
      KEYS.tijdByBronRef(uid, input.bron, input.bron_ref)
    );
    if (existing) {
      const dup = await kv.get<Tijdsregistratie>(KEYS.tijd(uid, existing));
      if (dup) return dup;
    }
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const row: Tijdsregistratie = { ...input, id, user_id: uid, created_at: now, updated_at: now };
  await kv.set(KEYS.tijd(uid, id), row);
  await kv.sadd(KEYS.tijdenIndex(uid), id);
  await kv.sadd(KEYS.tijdenByMonth(uid, monthKey(row.datum)), id);
  await kv.sadd(KEYS.tijdenByProject(uid, row.project_id), id);
  await kv.zadd(KEYS.tijdenByDate(uid), dateScore(row.datum), id);
  if (row.bron !== "handmatig" && row.bron_ref) {
    await kv.set(KEYS.tijdByBronRef(uid, row.bron, row.bron_ref), id);
  }
  return row;
}

export async function updateTijd(
  uid: string,
  id: string,
  patch: Partial<Tijdsregistratie>
): Promise<Tijdsregistratie> {
  const kv = getKv();
  const existing = await kv.get<Tijdsregistratie>(KEYS.tijd(uid, id));
  if (!existing) throw new Error("Tijdsregistratie niet gevonden.");
  if (existing.gefactureerd && (patch.uren !== undefined || patch.datum !== undefined || patch.project_id !== undefined)) {
    throw new Error("Deze registratie zit al op een factuur en kan niet gewijzigd worden.");
  }
  const next: Tijdsregistratie = {
    ...existing,
    ...patch,
    id: existing.id,
    user_id: uid,
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.tijd(uid, id), next);
  if (existing.datum !== next.datum) {
    await kv.srem(KEYS.tijdenByMonth(uid, monthKey(existing.datum)), id);
    await kv.sadd(KEYS.tijdenByMonth(uid, monthKey(next.datum)), id);
    await kv.zrem(KEYS.tijdenByDate(uid), id);
    await kv.zadd(KEYS.tijdenByDate(uid), dateScore(next.datum), id);
  }
  if (existing.project_id !== next.project_id) {
    await kv.srem(KEYS.tijdenByProject(uid, existing.project_id), id);
    await kv.sadd(KEYS.tijdenByProject(uid, next.project_id), id);
  }
  return next;
}

export async function deleteTijd(uid: string, id: string): Promise<void> {
  const kv = getKv();
  const row = await kv.get<Tijdsregistratie>(KEYS.tijd(uid, id));
  if (!row) return;
  if (row.gefactureerd) throw new Error("Deze registratie zit op een factuur en kan niet verwijderd worden.");
  await kv.del(KEYS.tijd(uid, id));
  await kv.srem(KEYS.tijdenIndex(uid), id);
  await kv.srem(KEYS.tijdenByMonth(uid, monthKey(row.datum)), id);
  await kv.srem(KEYS.tijdenByProject(uid, row.project_id), id);
  await kv.zrem(KEYS.tijdenByDate(uid), id);
  if (row.bron !== "handmatig" && row.bron_ref) {
    await kv.del(KEYS.tijdByBronRef(uid, row.bron, row.bron_ref));
  }
}

export async function markeerGefactureerd(
  uid: string,
  ids: string[],
  factuurId: string
): Promise<void> {
  const kv = getKv();
  for (const id of ids) {
    const row = await kv.get<Tijdsregistratie>(KEYS.tijd(uid, id));
    if (!row) continue;
    const next: Tijdsregistratie = {
      ...row,
      gefactureerd: true,
      factuur_id: factuurId,
      updated_at: new Date().toISOString(),
    };
    await kv.set(KEYS.tijd(uid, id), next);
  }
}

export async function ontkoppelFactuur(uid: string, factuurId: string): Promise<void> {
  const kv = getKv();
  const ids = await kv.smembers(KEYS.tijdenIndex(uid));
  for (const id of ids) {
    const row = await kv.get<Tijdsregistratie>(KEYS.tijd(uid, id));
    if (!row || row.factuur_id !== factuurId) continue;
    const next: Tijdsregistratie = {
      ...row,
      gefactureerd: false,
      factuur_id: null,
      updated_at: new Date().toISOString(),
    };
    await kv.set(KEYS.tijd(uid, id), next);
  }
}
