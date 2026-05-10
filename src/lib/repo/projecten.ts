import "server-only";

import { randomUUID } from "node:crypto";
import { getKv } from "@/lib/kv";
import { KEYS } from "@/lib/keys";
import type { Project } from "@/lib/types";

export async function listProjecten(uid: string): Promise<Project[]> {
  const kv = getKv();
  const ids = await kv.smembers(KEYS.projectenIndex(uid));
  if (ids.length === 0) return [];
  const rows = await kv.mget<Project>(...ids.map((id) => KEYS.project(uid, id)));
  return rows
    .filter((r): r is Project => Boolean(r))
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
}

export async function getProject(uid: string, id: string): Promise<Project | null> {
  return getKv().get<Project>(KEYS.project(uid, id));
}

export async function createProject(
  uid: string,
  input: Omit<Project, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Project> {
  const kv = getKv();
  const id = randomUUID();
  const now = new Date().toISOString();
  const project: Project = { ...input, id, user_id: uid, created_at: now, updated_at: now };
  await kv.set(KEYS.project(uid, id), project);
  await kv.sadd(KEYS.projectenIndex(uid), id);
  if (project.klant_id) {
    await kv.sadd(KEYS.projectenByKlant(uid, project.klant_id), id);
  }
  return project;
}

export async function updateProject(uid: string, id: string, patch: Partial<Project>): Promise<Project> {
  const kv = getKv();
  const existing = await kv.get<Project>(KEYS.project(uid, id));
  if (!existing) throw new Error("Project niet gevonden.");
  const next: Project = {
    ...existing,
    ...patch,
    id: existing.id,
    user_id: uid,
    updated_at: new Date().toISOString(),
  };
  await kv.set(KEYS.project(uid, id), next);
  if (existing.klant_id !== next.klant_id) {
    if (existing.klant_id) await kv.srem(KEYS.projectenByKlant(uid, existing.klant_id), id);
    if (next.klant_id) await kv.sadd(KEYS.projectenByKlant(uid, next.klant_id), id);
  }
  return next;
}

export async function deleteProject(uid: string, id: string): Promise<void> {
  const kv = getKv();
  const project = await kv.get<Project>(KEYS.project(uid, id));
  if (!project) return;
  const tijdenIds = await kv.smembers(KEYS.tijdenByProject(uid, id));
  if (tijdenIds.length > 0) {
    throw new Error("Project heeft nog tijdsregistraties; verwijder die eerst of archiveer het project.");
  }
  if (project.klant_id) await kv.srem(KEYS.projectenByKlant(uid, project.klant_id), id);
  await kv.del(KEYS.project(uid, id));
  await kv.srem(KEYS.projectenIndex(uid), id);
}

/** Resolves the effective hourly rate for a project: project > klant > profile. */
export async function effectiefUurtarief(
  uid: string,
  project: Project,
  klantUurtarief: number | null,
  profielUurtarief: number | null
): Promise<number | null> {
  if (project.uurtarief != null) return project.uurtarief;
  if (klantUurtarief != null) return klantUurtarief;
  return profielUurtarief;
}
