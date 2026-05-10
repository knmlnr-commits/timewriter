"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  createTijd,
  deleteTijd,
  updateTijd,
  listTijden,
} from "@/lib/repo/tijden";
import { parseUren } from "@/lib/parse-uren";
import type { Tijdsregistratie } from "@/lib/types";

const datumSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum.");

const createSchema = z.object({
  project_id: z.string().min(1, "Project is verplicht."),
  datum: datumSchema,
  uren: z.string().min(1, "Uren zijn verplicht."),
  omschrijving: z.string().default(""),
  factureerbaar: z.coerce.boolean().default(true),
});

export async function createTijdAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    project_id: formData.get("project_id"),
    datum: formData.get("datum"),
    uren: formData.get("uren"),
    omschrijving: formData.get("omschrijving") ?? "",
    factureerbaar: formData.get("factureerbaar") === "on" || formData.get("factureerbaar") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  }
  try {
    const uren = parseUren(parsed.data.uren);
    if (uren <= 0 || uren > 24) {
      return { ok: false, error: "Uren moet tussen 0 en 24 liggen." };
    }
    await createTijd(user.id, {
      project_id: parsed.data.project_id,
      datum: parsed.data.datum,
      uren,
      omschrijving: parsed.data.omschrijving,
      factureerbaar: parsed.data.factureerbaar,
      gefactureerd: false,
      factuur_id: null,
      bron: "handmatig",
      bron_ref: null,
      start_tijd: null,
      eind_tijd: null,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/uren");
  revalidatePath("/dashboard");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  project_id: z.string().min(1).optional(),
  datum: datumSchema.optional(),
  uren: z.string().optional(),
  omschrijving: z.string().optional(),
  factureerbaar: z.boolean().optional(),
});

export async function updateTijdAction(input: z.infer<typeof updateSchema>): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  try {
    const patch: Partial<Tijdsregistratie> = {};
    if (parsed.data.project_id) patch.project_id = parsed.data.project_id;
    if (parsed.data.datum) patch.datum = parsed.data.datum;
    if (parsed.data.uren !== undefined) {
      const u = parseUren(parsed.data.uren);
      if (u <= 0 || u > 24) return { ok: false, error: "Uren moet tussen 0 en 24 liggen." };
      patch.uren = u;
    }
    if (parsed.data.omschrijving !== undefined) patch.omschrijving = parsed.data.omschrijving;
    if (parsed.data.factureerbaar !== undefined) patch.factureerbaar = parsed.data.factureerbaar;
    await updateTijd(user.id, parsed.data.id, patch);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/uren");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTijdAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await deleteTijd(user.id, id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/uren");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function bulkUpdateFactureerbaar(ids: string[], factureerbaar: boolean) {
  const user = await requireUser();
  for (const id of ids) {
    try {
      await updateTijd(user.id, id, { factureerbaar });
    } catch {
      // skip records that can't be updated (already invoiced)
    }
  }
  revalidatePath("/uren");
}

export async function bulkDelete(ids: string[]) {
  const user = await requireUser();
  for (const id of ids) {
    try {
      await deleteTijd(user.id, id);
    } catch {
      // skip
    }
  }
  revalidatePath("/uren");
}

export async function recentProjectIds(): Promise<string[]> {
  const user = await requireUser();
  const rows = await listTijden(user.id);
  const seen = new Map<string, number>();
  for (const r of rows) {
    if (!seen.has(r.project_id)) seen.set(r.project_id, new Date(r.created_at).getTime());
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
}
