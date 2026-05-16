import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { PushSubscriptionRecord } from "@/lib/types";

/** Deterministische id zodat dezelfde browser-subscription geen duplicaten maakt. */
function idFor(endpoint: string): string {
  return createHash("sha1").update(endpoint).digest("hex").slice(0, 24);
}

export async function addPushSubscription(
  uid: string,
  input: { endpoint: string; p256dh: string; auth: string; user_agent?: string }
): Promise<PushSubscriptionRecord> {
  const kv = getKv();
  const id = idFor(input.endpoint);
  const existing = await kv.get<PushSubscriptionRecord>(KEYS.pushSub(uid, id));
  const record: PushSubscriptionRecord = {
    id,
    user_id: uid,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.user_agent ?? "",
    created_at: existing?.created_at ?? new Date().toISOString(),
  };
  await kv.set(KEYS.pushSub(uid, id), record);
  await kv.sadd(KEYS.pushSubsIndex(uid), id);
  return record;
}

export async function removePushSubscriptionByEndpoint(
  uid: string,
  endpoint: string
): Promise<void> {
  const kv = getKv();
  const id = idFor(endpoint);
  await kv.del(KEYS.pushSub(uid, id));
  await kv.srem(KEYS.pushSubsIndex(uid), id);
}

export async function listPushSubscriptions(uid: string): Promise<PushSubscriptionRecord[]> {
  const kv = getKv();
  const ids = await kv.smembers(KEYS.pushSubsIndex(uid));
  if (ids.length === 0) return [];
  const rows = await kv.mget<PushSubscriptionRecord>(...ids.map((id) => KEYS.pushSub(uid, id)));
  return rows.filter((r): r is PushSubscriptionRecord => Boolean(r));
}

export async function dropPushSubscriptionById(uid: string, id: string): Promise<void> {
  const kv = getKv();
  await kv.del(KEYS.pushSub(uid, id));
  await kv.srem(KEYS.pushSubsIndex(uid), id);
}
