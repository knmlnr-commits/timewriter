"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createTijd } from "@/lib/repo/tijden";
import { lookupMapping, rememberMapping } from "@/lib/repo/ics-mapping";

const itemSchema = z.object({
  uid: z.string(),
  subject: z.string(),
  start: z.string(),
  end: z.string(),
  durationHours: z.number(),
  project_id: z.string().nullable(),
  skip: z.boolean(),
  remember: z.boolean(),
});

export async function importIcsAction(items: unknown[]): Promise<{
  ok: boolean;
  created?: number;
  skipped?: number;
  duplicates?: number;
  error?: string;
}> {
  const user = await requireUser();
  const parsed = z.array(itemSchema).safeParse(items);
  if (!parsed.success) return { ok: false, error: "Ongeldige import-data." };
  let created = 0;
  let skipped = 0;
  let duplicates = 0;
  for (const item of parsed.data) {
    if (item.skip || !item.project_id) {
      skipped++;
      continue;
    }
    try {
      const startDate = new Date(item.start);
      const endDate = new Date(item.end);
      const datum = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      const tijd = await createTijd(user.id, {
        project_id: item.project_id,
        datum,
        uren: item.durationHours,
        omschrijving: item.subject,
        factureerbaar: true,
        gefactureerd: false,
        factuur_id: null,
        bron: "ics_import",
        bron_ref: item.uid,
        start_tijd: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
        eind_tijd: `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
      });
      // createTijd returns the existing row if bron_ref already mapped → detect dedup
      if (tijd.bron === "ics_import" && tijd.bron_ref === item.uid && tijd.omschrijving === item.subject && tijd.uren === item.durationHours) {
        // could be either fresh or dup; we approximate by checking created_at proximity
        const ageMs = Date.now() - new Date(tijd.created_at).getTime();
        if (ageMs > 5000) duplicates++;
        else created++;
      } else {
        created++;
      }
      if (item.remember) {
        await rememberMapping(user.id, item.subject, item.project_id);
      }
    } catch {
      skipped++;
    }
  }
  revalidatePath("/uren");
  revalidatePath("/dashboard");
  return { ok: true, created, skipped, duplicates };
}

export async function suggestMapping(subjects: string[]): Promise<Record<string, string | null>> {
  const user = await requireUser();
  const out: Record<string, string | null> = {};
  const seen = new Set<string>();
  for (const s of subjects) {
    if (seen.has(s)) continue;
    seen.add(s);
    const m = await lookupMapping(user.id, s);
    out[s] = m?.project_id ?? null;
  }
  return out;
}
