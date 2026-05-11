import "server-only";

import { randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { WeeklyPattern } from "@/lib/types";

export async function getDefaultWeek(uid: string): Promise<WeeklyPattern[]> {
  const kv = getKv();
  const list = await kv.get<WeeklyPattern[]>(KEYS.defaultWeek(uid));
  return Array.isArray(list) ? list : [];
}

export async function setDefaultWeek(uid: string, patterns: WeeklyPattern[]): Promise<WeeklyPattern[]> {
  const kv = getKv();
  // Normaliseer ids en velden defensief
  const sanitized: WeeklyPattern[] = patterns.map((p) => ({
    id: p.id || randomUUID(),
    day: p.day,
    hours: Number(p.hours) || 0,
    project_id: String(p.project_id),
    omschrijving: String(p.omschrijving ?? ""),
  }));
  await kv.set(KEYS.defaultWeek(uid), sanitized);
  return sanitized;
}
