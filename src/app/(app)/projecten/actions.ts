"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createProject, deleteProject, updateProject } from "@/lib/repo/projecten";

const schema = z.object({
  naam: z.string().min(1, "Naam is verplicht."),
  klant_id: z.string().optional().nullable(),
  omschrijving: z.string().default(""),
  uurtarief: z.coerce.number().nonnegative().nullable().optional(),
  kleur: z.string().default("#777777"),
  factureerbaar: z.coerce.boolean().default(true),
  archief: z.coerce.boolean().default(false),
});

export async function saveProjectAction(
  id: string | null,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const klantId = String(formData.get("klant_id") ?? "");
  const parsed = schema.safeParse({
    naam: formData.get("naam"),
    klant_id: klantId === "__none__" || !klantId ? null : klantId,
    omschrijving: formData.get("omschrijving") ?? "",
    uurtarief: formData.get("uurtarief") || null,
    kleur: formData.get("kleur") || "#777777",
    factureerbaar: formData.get("factureerbaar") === "on" || formData.get("factureerbaar") === "true",
    archief: formData.get("archief") === "on" || formData.get("archief") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  try {
    if (id) {
      await updateProject(user.id, id, {
        ...parsed.data,
        uurtarief: parsed.data.uurtarief ?? null,
        klant_id: parsed.data.klant_id ?? null,
      });
    } else {
      await createProject(user.id, {
        ...parsed.data,
        uurtarief: parsed.data.uurtarief ?? null,
        klant_id: parsed.data.klant_id ?? null,
      });
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/projecten");
  revalidatePath("/uren");
  return { ok: true };
}

export async function toggleArchiefProject(id: string, archief: boolean) {
  const user = await requireUser();
  await updateProject(user.id, id, { archief });
  revalidatePath("/projecten");
}

export async function deleteProjectAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await deleteProject(user.id, id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/projecten");
  return { ok: true };
}
