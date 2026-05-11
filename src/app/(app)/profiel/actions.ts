"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changePassword, requireUser, updateProfileSafe } from "@/lib/auth";
import type { Profile } from "@/lib/auth";

const ACCENT_PALETTE = ["#E8732A", "#2563EB", "#16A34A", "#7C3AED", "#0D9488", "#52525B"];

const MAX_LOGO_BYTES = 200 * 1024; // ~150KB original; allow some headroom encoded
const schema = z.object({
  naam: z.string().min(1),
  accent_kleur: z.string(),
  standaard_uurtarief: z.coerce.number().nonnegative().nullable().optional(),
  factuur_naam: z.string().default(""),
  factuur_adres: z.string().default(""),
  factuur_postcode: z.string().default(""),
  factuur_plaats: z.string().default(""),
  kvk_nummer: z.string().default(""),
  btw_nummer: z.string().default(""),
  iban: z.string().default(""),
  factuur_voettekst: z.string().default(""),
  factuur_website: z.string().default(""),
  factuur_telefoon: z.string().default(""),
  factuur_logo_data: z
    .string()
    .max(MAX_LOGO_BYTES, "Logo te groot. Verklein eerst.")
    .refine(
      (v) => v === "" || v.startsWith("data:image/"),
      "Logo moet een data URL zijn (PNG, JPG of SVG)."
    )
    .default(""),
  factuurnummer_prefix: z.string().default(""),
  volgend_factuurnummer: z.coerce.number().int().positive().default(1),
});

export async function saveProfielAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    naam: formData.get("naam"),
    accent_kleur: ACCENT_PALETTE.includes(String(formData.get("accent_kleur"))) ? formData.get("accent_kleur") : "#E8732A",
    standaard_uurtarief: formData.get("standaard_uurtarief") || null,
    factuur_naam: formData.get("factuur_naam") ?? "",
    factuur_adres: formData.get("factuur_adres") ?? "",
    factuur_postcode: formData.get("factuur_postcode") ?? "",
    factuur_plaats: formData.get("factuur_plaats") ?? "",
    kvk_nummer: formData.get("kvk_nummer") ?? "",
    btw_nummer: formData.get("btw_nummer") ?? "",
    iban: formData.get("iban") ?? "",
    factuur_voettekst: formData.get("factuur_voettekst") ?? "",
    factuur_website: formData.get("factuur_website") ?? "",
    factuur_telefoon: formData.get("factuur_telefoon") ?? "",
    factuur_logo_data: formData.get("factuur_logo_data") ?? "",
    factuurnummer_prefix: formData.get("factuurnummer_prefix") ?? "",
    volgend_factuurnummer: formData.get("volgend_factuurnummer") || 1,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  const patch: Partial<Profile> = {
    naam: parsed.data.naam,
    accent_kleur: parsed.data.accent_kleur,
    standaard_uurtarief: parsed.data.standaard_uurtarief ?? null,
    factuur_naam: parsed.data.factuur_naam,
    factuur_adres: parsed.data.factuur_adres,
    factuur_postcode: parsed.data.factuur_postcode,
    factuur_plaats: parsed.data.factuur_plaats,
    kvk_nummer: parsed.data.kvk_nummer,
    btw_nummer: parsed.data.btw_nummer,
    iban: parsed.data.iban,
    factuur_voettekst: parsed.data.factuur_voettekst,
    factuur_website: parsed.data.factuur_website,
    factuur_telefoon: parsed.data.factuur_telefoon,
    factuur_logo_data: parsed.data.factuur_logo_data,
    factuurnummer_prefix: parsed.data.factuurnummer_prefix,
    volgend_factuurnummer: parsed.data.volgend_factuurnummer,
    voltooid: true,
  };
  await updateProfileSafe(user.id, patch);
  revalidatePath("/profiel");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePasswordAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const wachtwoord = String(formData.get("wachtwoord") ?? "");
  try {
    await changePassword(user.id, wachtwoord);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  return { ok: true };
}
