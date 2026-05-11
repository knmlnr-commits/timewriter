"use server";

import { revalidatePath } from "next/cache";
import { addDays, format } from "date-fns";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getKlant } from "@/lib/repo/klanten";
import { createFactuur, deleteFactuur, getFactuur, round2, setIncludeUrenBijlage, updateFactuurRegels, updateFactuurStatus } from "@/lib/repo/facturen";
import { markeerGefactureerd, ontkoppelFactuur } from "@/lib/repo/tijden";
import { redirect } from "next/navigation";
import type { FactuurRegel, FactuurStatus } from "@/lib/types";

const regelSchema = z.object({
  omschrijving: z.string(),
  aantal_uren: z.coerce.number().nonnegative(),
  uurtarief: z.coerce.number().nonnegative(),
  bedrag: z.coerce.number(),
  tijd_ids: z.array(z.string()),
});

const createSchema = z.object({
  klant_id: z.string().min(1),
  periode_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periode_eind: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  factuurdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notities: z.string().default(""),
  include_uren_bijlage: z.boolean().optional().default(false),
  uw_ordernummer: z.string().optional().default(""),
  betalingskenmerk: z.string().optional().default(""),
  regels: z.array(regelSchema).min(1),
  tijd_ids: z.array(z.string()),
});

export async function generateFactuurAction(input: z.infer<typeof createSchema>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };

  try {
    const klant = await getKlant(user.id, parsed.data.klant_id);
    if (!klant) return { ok: false, error: "Klant niet gevonden." };

    // Defensieve defaults: oudere klant-records kunnen velden missen waardoor
    // berekeningen NaN opleveren, wat JSON-geserialiseerd null wordt en de
    // detailpagina laat crashen op .toFixed().
    const btwPct = Number.isFinite(klant.btw_percentage) ? klant.btw_percentage : 21;
    const termijn = Number.isFinite(klant.betaaltermijn_dagen) ? klant.betaaltermijn_dagen : 30;

    const regels: FactuurRegel[] = parsed.data.regels.map((r) => ({
      omschrijving: r.omschrijving,
      aantal_uren: round2(r.aantal_uren),
      uurtarief: round2(r.uurtarief),
      bedrag: round2(r.bedrag),
      tijd_ids: r.tijd_ids,
    }));
    const totaal_excl_btw = round2(regels.reduce((s, r) => s + r.bedrag, 0));
    const btw_bedrag = round2(totaal_excl_btw * (btwPct / 100));
    const totaal_incl_btw = round2(totaal_excl_btw + btw_bedrag);

    const factuur = await createFactuur(user.id, {
      klant_id: klant.id,
      periode_start: parsed.data.periode_start,
      periode_eind: parsed.data.periode_eind,
      factuurdatum: parsed.data.factuurdatum,
      vervaldatum: format(addDays(new Date(parsed.data.factuurdatum), termijn), "yyyy-MM-dd"),
      regels,
      totaal_excl_btw,
      btw_percentage: btwPct,
      btw_bedrag,
      totaal_incl_btw,
      status: "concept",
      notities: parsed.data.notities,
      include_uren_bijlage: parsed.data.include_uren_bijlage,
      uw_ordernummer: parsed.data.uw_ordernummer || undefined,
      betalingskenmerk: parsed.data.betalingskenmerk || undefined,
      verzonden_op: null,
      betaald_op: null,
    });

    await markeerGefactureerd(user.id, parsed.data.tijd_ids, factuur.id);

    revalidatePath("/facturen");
    revalidatePath("/uren");
    revalidatePath("/dashboard");
    return { ok: true, id: factuur.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
}

export async function updateFactuurStatusAction(id: string, status: FactuurStatus) {
  const user = await requireUser();
  await updateFactuurStatus(user.id, id, status);
  revalidatePath("/facturen");
  revalidatePath(`/facturen/${id}`);
}

export async function updateFactuurRegelsAction(id: string, regels: FactuurRegel[]) {
  const user = await requireUser();
  await updateFactuurRegels(user.id, id, regels);
  revalidatePath(`/facturen/${id}`);
}

export async function toggleUrenBijlageAction(id: string, include: boolean): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await setIncludeUrenBijlage(user.id, id, include);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/facturen");
  revalidatePath(`/facturen/${id}`);
  return { ok: true };
}

export async function deleteFactuurAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    const f = await getFactuur(user.id, id);
    if (!f) return { ok: false, error: "Niet gevonden." };
    await deleteFactuur(user.id, id);
    await ontkoppelFactuur(user.id, id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/facturen");
  revalidatePath("/uren");
  redirect("/facturen");
}
