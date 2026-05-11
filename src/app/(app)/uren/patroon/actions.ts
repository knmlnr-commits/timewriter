"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { setDefaultWeek } from "@/lib/repo/default-week";
import type { WeeklyPattern } from "@/lib/types";

const patternSchema = z.object({
  id: z.string().optional(),
  day: z.enum(["ma", "di", "wo", "do", "vr", "za", "zo"]),
  hours: z.coerce.number().positive().max(24),
  project_id: z.string().min(1),
  omschrijving: z.string().default(""),
});

export async function savePatroonAction(
  input: unknown
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = z.array(patternSchema).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  }
  const sanitized: WeeklyPattern[] = parsed.data.map((p) => ({
    id: p.id || crypto.randomUUID(),
    day: p.day,
    hours: p.hours,
    project_id: p.project_id,
    omschrijving: p.omschrijving,
  }));
  try {
    await setDefaultWeek(user.id, sanitized);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Opslaan mislukt." };
  }
  revalidatePath("/uren/patroon");
  revalidatePath("/uren/chat");
  return { ok: true };
}
