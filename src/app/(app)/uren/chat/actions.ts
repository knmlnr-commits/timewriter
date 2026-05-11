"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createTijd } from "@/lib/repo/tijden";

const entrySchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  project_id: z.string().min(1),
  uren: z.number().positive().max(24),
  omschrijving: z.string().optional().default(""),
});

function bronRef(datum: string, project_id: string, uren: number, omschrijving: string): string {
  const key = `chat|${datum}|${project_id}|${uren.toFixed(2)}|${omschrijving.trim().toLowerCase()}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 24);
}

export async function commitChatEntriesAction(
  rawEntries: unknown
): Promise<{ ok: boolean; created?: number; duplicates?: number; skipped?: number; error?: string }> {
  const user = await requireUser();
  const parsed = z.array(entrySchema).safeParse(rawEntries);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  }

  let created = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const e of parsed.data) {
    try {
      const ref = bronRef(e.datum, e.project_id, e.uren, e.omschrijving);
      const tijd = await createTijd(user.id, {
        project_id: e.project_id,
        datum: e.datum,
        uren: e.uren,
        omschrijving: e.omschrijving || "",
        factureerbaar: true,
        gefactureerd: false,
        factuur_id: null,
        bron: "tekst_import",
        bron_ref: ref,
        start_tijd: null,
        eind_tijd: null,
      });
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
