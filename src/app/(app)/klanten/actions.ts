"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createKlant, deleteKlant, updateKlant } from "@/lib/repo/klanten";

const schema = z.object({
  naam: z.string().min(1, "Naam is verplicht."),
  factuur_email: z.string().email().or(z.literal("")).default(""),
  factuur_adres: z.string().default(""),
  factuur_postcode: z.string().default(""),
  factuur_plaats: z.string().default(""),
  standaard_uurtarief: z.coerce.number().nonnegative().nullable().optional(),
  btw_percentage: z.coerce.number().min(0).max(100).default(21),
  betaaltermijn_dagen: z.coerce.number().int().min(0).max(365).default(30),
  notities: z.string().default(""),
  archief: z.coerce.boolean().default(false),
});

function fromFormData(formData: FormData) {
  return {
    naam: formData.get("naam"),
    factuur_email: formData.get("factuur_email") ?? "",
    factuur_adres: formData.get("factuur_adres") ?? "",
    factuur_postcode: formData.get("factuur_postcode") ?? "",
    factuur_plaats: formData.get("factuur_plaats") ?? "",
    standaard_uurtarief: formData.get("standaard_uurtarief") || null,
    btw_percentage: formData.get("btw_percentage") || 21,
    betaaltermijn_dagen: formData.get("betaaltermijn_dagen") || 30,
    notities: formData.get("notities") ?? "",
    archief: formData.get("archief") === "on" || formData.get("archief") === "true",
  };
}

export async function saveKlantAction(
  id: string | null,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(fromFormData(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  try {
    if (id) {
      await updateKlant(user.id, id, {
        ...parsed.data,
        standaard_uurtarief: parsed.data.standaard_uurtarief ?? null,
      });
    } else {
      await createKlant(user.id, {
        ...parsed.data,
        standaard_uurtarief: parsed.data.standaard_uurtarief ?? null,
      });
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/klanten");
  return { ok: true };
}

export async function toggleArchiefKlant(id: string, archief: boolean) {
  const user = await requireUser();
  await updateKlant(user.id, id, { archief });
  revalidatePath("/klanten");
}

export async function deleteKlantAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await deleteKlant(user.id, id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/klanten");
  return { ok: true };
}
