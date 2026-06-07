"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createBonnetje, deleteBonnetje, updateBonnetje } from "@/lib/repo/bonnetjes";
import { BONNETJE_CATEGORIEEN } from "@/lib/types";

const MAX_FOTO_BYTES = 600 * 1024; // ~450KB after base64 overhead

const baseSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum als YYYY-MM-DD."),
  bedrag: z.coerce.number().positive().max(100000),
  btw_bedrag: z.coerce.number().nonnegative().max(100000).nullable().optional(),
  valuta: z.string().min(3).max(4).default("EUR"),
  leverancier: z.string().min(1, "Leverancier verplicht."),
  categorie: z.enum([...BONNETJE_CATEGORIEEN]),
  omschrijving: z.string().default(""),
  klant_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  doorbelast: z.coerce.boolean().default(false),
  foto_data: z
    .string()
    .max(MAX_FOTO_BYTES, "Foto te groot; verklein eerst.")
    .refine(
      (v) => v === "" || v.startsWith("data:image/"),
      "Foto moet een data URL zijn (PNG, JPG of WebP)."
    )
    .default(""),
  bron: z.enum(["handmatig", "foto_ai"]).default("handmatig"),
});

export async function createBonnetjeAction(
  input: unknown
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await requireUser();
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldig." };
  try {
    const row = await createBonnetje(user.id, {
      datum: parsed.data.datum,
      bedrag: parsed.data.bedrag,
      btw_bedrag: parsed.data.btw_bedrag ?? null,
      valuta: parsed.data.valuta.toUpperCase(),
      leverancier: parsed.data.leverancier,
      categorie: parsed.data.categorie,
      omschrijving: parsed.data.omschrijving,
      klant_id: parsed.data.klant_id || null,
      project_id: parsed.data.project_id || null,
      doorbelast: parsed.data.doorbelast,
      factuur_id: null,
      foto_data: parsed.data.foto_data,
      bron: parsed.data.bron,
    });
    revalidatePath("/bonnetjes");
    revalidatePath("/dashboard");
    return { ok: true, id: row.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
}

const updateSchema = baseSchema.partial().extend({ id: z.string().min(1) });

export async function updateBonnetjeAction(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldig." };
  try {
    const { id, ...patch } = parsed.data;
    await updateBonnetje(user.id, id, {
      ...(patch.datum && { datum: patch.datum }),
      ...(patch.bedrag !== undefined && { bedrag: patch.bedrag }),
      ...(patch.btw_bedrag !== undefined && { btw_bedrag: patch.btw_bedrag ?? null }),
      ...(patch.valuta && { valuta: patch.valuta.toUpperCase() }),
      ...(patch.leverancier && { leverancier: patch.leverancier }),
      ...(patch.categorie && { categorie: patch.categorie }),
      ...(patch.omschrijving !== undefined && { omschrijving: patch.omschrijving }),
      ...(patch.klant_id !== undefined && { klant_id: patch.klant_id || null }),
      ...(patch.project_id !== undefined && { project_id: patch.project_id || null }),
      ...(patch.doorbelast !== undefined && { doorbelast: patch.doorbelast }),
      ...(patch.foto_data !== undefined && { foto_data: patch.foto_data }),
    });
    revalidatePath("/bonnetjes");
    revalidatePath(`/bonnetjes/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
}

export async function deleteBonnetjeAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await deleteBonnetje(user.id, id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/bonnetjes");
  return { ok: true };
}
