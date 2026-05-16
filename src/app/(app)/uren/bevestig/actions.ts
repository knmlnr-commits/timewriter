"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDefaultWeek } from "@/lib/repo/default-week";
import { createTijd } from "@/lib/repo/tijden";

const schema = z.object({
  pattern_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.coerce.number().positive().max(24).optional(),
});

function bronRef(patternId: string, date: string, hours: number): string {
  const key = `reminder|${patternId}|${date}|${hours.toFixed(2)}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 24);
}

/** Bevestig de reminder → boek de uren uit het pattern (of een aangepast aantal). */
export async function confirmReminderAction(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  }

  const patterns = await getDefaultWeek(user.id);
  const pattern = patterns.find((p) => p.id === parsed.data.pattern_id);
  if (!pattern) {
    return { ok: false, error: "Patroon niet gevonden." };
  }

  const uren = parsed.data.hours ?? pattern.hours;
  if (uren <= 0 || uren > 24) {
    return { ok: false, error: "Uren moet tussen 0 en 24 liggen." };
  }

  try {
    await createTijd(user.id, {
      project_id: pattern.project_id,
      datum: parsed.data.date,
      uren,
      omschrijving: pattern.omschrijving || "",
      factureerbaar: true,
      gefactureerd: false,
      factuur_id: null,
      bron: "tekst_import",
      bron_ref: bronRef(parsed.data.pattern_id, parsed.data.date, uren),
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
