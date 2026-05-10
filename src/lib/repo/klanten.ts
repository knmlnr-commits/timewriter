import "server-only";

import { randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { Klant } from "@/lib/types";

export async function listKlanten(uid: string): Promise<Klant[]> {
  const kv = getKv();
  const ids = await kv.smembers(KEYS.klantenIndex(uid));
  if (ids.length === 0) return [];
  const rows = await kv.mget<Klant>(...ids.map((id) => KEYS.klant(uid, id)));
  return rows
    .filter((r): r is Klant => Boolean(r))
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
}

export async function getKlant(uid: string, id: string): Promise<Klant | null> {
  return getKv().get<Klant>(KEYS.klant(uid, id));
}

export async function createKlant(uid: string, input: Omit<Klant, "id" | "user_id" | "created_at" | "updated_at">): Promise<Klant> {
  const kv = getKv();
  const id = randomUUID();
  const now = new Date().toISOString();
  const klant: Klant = { ...input, id, user_id: uid, created_at: now, updated_at: now };
  await kv.set(KEYS.klant(uid, id), klant);
  await kv.sadd(KEYS.klantenIndex(uid), id);
  return klant;
}

export async function updateKlant(uid: string, id: string, patch: Partial<Klant>): Promise<Klant> {
  const kv = getKv();
  const existing = await kv.get<Klant>(KEYS.klant(uid, id));
  if (!existing) throw new Error("Klant niet gevonden.");
  const next: Klant = { ...existing, ...patch, id: existing.id, user_id: uid, updated_at: new Date().toISOString() };
  await kv.set(KEYS.klant(uid, id), next);
  return next;
}

export async function deleteKlant(uid: string, id: string): Promise<void> {
  const kv = getKv();
  const projectenIds = await kv.smembers(KEYS.projectenByKlant(uid, id));
  if (projectenIds.length > 0) {
    throw new Error("Klant heeft nog projecten; verwijder of ontkoppel die eerst.");
  }
  await kv.del(KEYS.klant(uid, id));
  await kv.srem(KEYS.klantenIndex(uid), id);
}
