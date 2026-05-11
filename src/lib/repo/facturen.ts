import "server-only";

import { randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { Factuur, FactuurRegel, FactuurStatus } from "@/lib/types";
import { getUserRecord, updateProfile } from "@/lib/auth";

export async function listFacturen(uid: string): Promise<Factuur[]> {
  const kv = getKv();
  const ids = await kv.smembers(KEYS.facturenIndex(uid));
  if (ids.length === 0) return [];
  const rows = await kv.mget<Factuur>(...ids.map((id) => KEYS.factuur(uid, id)));
  return rows
    .filter((r): r is Factuur => Boolean(r))
    .sort((a, b) => (a.factuurdatum < b.factuurdatum ? 1 : -1));
}

export async function getFactuur(uid: string, id: string): Promise<Factuur | null> {
  return getKv().get<Factuur>(KEYS.factuur(uid, id));
}

/**
 * Atomic factuurnummer increment via Redis INCR. Replaces the Postgres
 * SECURITY DEFINER function the prompt called for. Race-condition safe because
 * INCR is atomic at the KV-server level.
 */
export async function nextFactuurnummer(uid: string): Promise<string> {
  const kv = getKv();
  const user = await getUserRecord(uid);
  if (!user) throw new Error("Gebruiker niet gevonden.");
  const counterKey = KEYS.factuurNextNummer(uid);
  let raw = await kv.get<number | string>(counterKey);
  if (raw === null || raw === undefined) {
    // initialise to the user's configured start; INCR on a non-existent key returns 1
    const start = user.profile.volgend_factuurnummer ?? 1;
    if (start > 1) {
      await kv.set(counterKey, start - 1);
    }
  }
  const next = await kv.incr(counterKey);
  await updateProfile(uid, { volgend_factuurnummer: next + 1 });
  const prefix = user.profile.factuurnummer_prefix ?? "";
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export async function createFactuur(
  uid: string,
  input: Omit<Factuur, "id" | "user_id" | "created_at" | "updated_at" | "factuurnummer"> & {
    factuurnummer?: string;
  }
): Promise<Factuur> {
  const kv = getKv();
  const id = randomUUID();
  const now = new Date().toISOString();
  const factuurnummer = input.factuurnummer ?? (await nextFactuurnummer(uid));
  const factuur: Factuur = {
    ...input,
    factuurnummer,
    id,
    user_id: uid,
    created_at: now,
    updated_at: now,
  };
  await kv.set(KEYS.factuur(uid, id), factuur);
  await kv.sadd(KEYS.facturenIndex(uid), id);
  return factuur;
}

export async function setIncludeUrenBijlage(
  uid: string,
  id: string,
  include: boolean
): Promise<Factuur> {
  const kv = getKv();
  const existing = await kv.get<Factuur>(KEYS.factuur(uid, id));
  if (!existing) throw new Error("Factuur niet gevonden.");
  const next: Factuur = {
    ...existing,
    include_uren_bijlage: include,
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.factuur(uid, id), next);
  return next;
}

export async function updateFactuurStatus(
  uid: string,
  id: string,
  status: FactuurStatus
): Promise<Factuur> {
  const kv = getKv();
  const existing = await kv.get<Factuur>(KEYS.factuur(uid, id));
  if (!existing) throw new Error("Factuur niet gevonden.");
  const now = new Date().toISOString();
  const next: Factuur = {
    ...existing,
    status,
    verzonden_op: status === "verzonden" ? existing.verzonden_op ?? now : existing.verzonden_op,
    betaald_op: status === "betaald" ? existing.betaald_op ?? now : existing.betaald_op,
    updated_at: now,
  };
  await kv.set(KEYS.factuur(uid, id), next);
  return next;
}

export async function updateFactuurRegels(
  uid: string,
  id: string,
  regels: FactuurRegel[]
): Promise<Factuur> {
  const kv = getKv();
  const existing = await kv.get<Factuur>(KEYS.factuur(uid, id));
  if (!existing) throw new Error("Factuur niet gevonden.");
  const totaal_excl_btw = round2(regels.reduce((s, r) => s + r.bedrag, 0));
  const btw_bedrag = round2(totaal_excl_btw * (existing.btw_percentage / 100));
  const totaal_incl_btw = round2(totaal_excl_btw + btw_bedrag);
  const next: Factuur = {
    ...existing,
    regels,
    totaal_excl_btw,
    btw_bedrag,
    totaal_incl_btw,
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.factuur(uid, id), next);
  return next;
}

export async function deleteFactuur(uid: string, id: string): Promise<void> {
  const kv = getKv();
  const existing = await kv.get<Factuur>(KEYS.factuur(uid, id));
  if (!existing) return;
  if (existing.status === "betaald") {
    throw new Error("Betaalde factuur kan niet verwijderd worden. Markeer geannuleerd in plaats daarvan.");
  }
  await kv.del(KEYS.factuur(uid, id));
  await kv.srem(KEYS.facturenIndex(uid), id);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
