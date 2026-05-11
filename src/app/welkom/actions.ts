"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, updateProfileSafe } from "@/lib/auth";

const schema = z.object({
  naam: z.string().min(1, "Naam is verplicht."),
  standaard_uurtarief: z.coerce.number().nonnegative().nullable().optional(),
  accent_kleur: z.string().min(4),
});

const ACCENT_PALETTE = ["#E8732A", "#2563EB", "#16A34A", "#7C3AED", "#0D9488", "#52525B"];

export async function completeOnboardingAction(
  _: unknown,
  formData: FormData
): Promise<{ error?: string } | void> {
  const user = await requireUser();
  const accent = String(formData.get("accent_kleur") ?? "#E8732A");
  const safeAccent = ACCENT_PALETTE.includes(accent) ? accent : "#E8732A";
  const parsed = schema.safeParse({
    naam: formData.get("naam"),
    standaard_uurtarief: formData.get("standaard_uurtarief") || null,
    accent_kleur: safeAccent,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  await updateProfileSafe(user.id, {
    naam: parsed.data.naam,
    standaard_uurtarief: parsed.data.standaard_uurtarief ?? null,
    accent_kleur: parsed.data.accent_kleur,
    voltooid: true,
  });
  redirect("/dashboard");
}
