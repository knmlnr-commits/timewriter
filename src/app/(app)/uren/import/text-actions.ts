"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createTijd } from "@/lib/repo/tijden";

const rowSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  uren: z.number().positive().max(24),
  omschrijving: z.string().min(1),
  project_id: z.string().min(1),
  factureerbaar: z.boolean().default(true),
});

/**
 * Deduplicatie-ref voor tekst-import. Geen externe stabiele ID beschikbaar,
 * dus we leiden er één af uit (datum + project + omschrijving + uren).
 * Twee keer dezelfde regel plakken op dezelfde dag tegen hetzelfde project
 * geeft één registratie, niet twee. Dat is bewust: typisch is dat wat de
 * gebruiker wil.
 */
function bronRef(datum: string, project_id: string, omschrijving: string, uren: number): string {
  const key = `${datum}|${project_id}|${omschrijving.trim().toLowerCase()}|${uren.toFixed(2)}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 24);
}

export async function importTextAction(
  rows: unknown
): Promise<{ ok: boolean; created?: number; duplicates?: number; skipped?: number; error?: string }> {
  const user = await requireUser();
  const parsed = z.array(rowSchema).safeParse(rows);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer." };

  let created = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    try {
      const ref = bronRef(row.datum, row.project_id, row.omschrijving, row.uren);
      const tijd = await createTijd(user.id, {
        project_id: row.project_id,
        datum: row.datum,
        uren: row.uren,
        omschrijving: row.omschrijving,
        factureerbaar: row.factureerbaar,
        gefactureerd: false,
        factuur_id: null,
        bron: "tekst_import",
        bron_ref: ref,
        start_tijd: null,
        eind_tijd: null,
      });
      // createTijd geeft bij dedup het bestaande record terug. We meten of
      // het record zojuist is aangemaakt (timestamp < 5 s oud) versus al
      // bestond. Voor de tekst-import is dedup gewenst gedrag.
      const ageMs = Date.now() - new Date(tijd.created_at).getTime();
      if (ageMs < 5000) created++;
      else duplicates++;
    } catch {
      skipped++;
    }
  }

  revalidatePath("/uren");
  revalidatePath("/dashboard");
  return { ok: true, created, duplicates, skipped };
}
