import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { IcsMapping } from "@/lib/types";

export function hashSubject(subject: string): string {
  return createHash("sha1")
    .update(subject.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

export async function lookupMapping(uid: string, subject: string): Promise<IcsMapping | null> {
  return getKv().get<IcsMapping>(KEYS.icsMapping(uid, hashSubject(subject)));
}

export async function rememberMapping(
  uid: string,
  subject: string,
  projectId: string
): Promise<IcsMapping> {
  const kv = getKv();
  const hash = hashSubject(subject);
  const mapping: IcsMapping = {
    id: randomUUID(),
    user_id: uid,
    subject_pattern: subject.trim().toLowerCase(),
    project_id: projectId,
    created_at: new Date().toISOString(),
  };
  await kv.set(KEYS.icsMapping(uid, hash), mapping);
  await kv.sadd(KEYS.icsMappingIndex(uid), hash);
  return mapping;
}

export async function listMappings(uid: string): Promise<IcsMapping[]> {
  const kv = getKv();
  const hashes = await kv.smembers(KEYS.icsMappingIndex(uid));
  if (hashes.length === 0) return [];
  const rows = await kv.mget<IcsMapping>(...hashes.map((h) => KEYS.icsMapping(uid, h)));
  return rows.filter((r): r is IcsMapping => Boolean(r));
}

export async function deleteMapping(uid: string, subject: string): Promise<void> {
  const kv = getKv();
  const hash = hashSubject(subject);
  await kv.del(KEYS.icsMapping(uid, hash));
  await kv.srem(KEYS.icsMappingIndex(uid), hash);
}
