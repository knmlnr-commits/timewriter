"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  adminCreateUser,
  adminDeleteUser,
  adminResetPassword,
  adminSetAdmin,
  isAdmin,
  requireAdmin,
} from "@/lib/auth";

const createSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres."),
  naam: z.string().min(1, "Naam is verplicht."),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn."),
  is_admin: z.coerce.boolean().optional().default(false),
});

export async function createUserAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string; created?: { email: string } }> {
  await requireAdmin();
  const parsed = createSchema.safeParse({
    email: formData.get("email"),
    naam: formData.get("naam"),
    password: formData.get("password"),
    is_admin: formData.get("is_admin") === "on" || formData.get("is_admin") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer." };
  }
  try {
    const user = await adminCreateUser(parsed.data);
    revalidatePath("/admin");
    return { ok: true, created: { email: user.email } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
}

export async function deleteUserAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    return { ok: false, error: "Je kunt je eigen account niet verwijderen." };
  }
  try {
    await adminDeleteUser(userId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleAdminAction(
  userId: string,
  makeAdmin: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (admin.id === userId && !makeAdmin && !isAdmin({ email: admin.email, profile: { is_admin: false } })) {
    // De huidige beheerder mag zichzelf alleen demoten als de env-override hen alsnog admin laat.
    return { ok: false, error: "Je kunt jezelf niet demoten zonder een tweede beheerder of ADMIN_EMAILS." };
  }
  try {
    await adminSetAdmin(userId, makeAdmin);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/admin");
  return { ok: true };
}

const resetSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens zijn."),
});

export async function resetPasswordAction(
  userId: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = resetSchema.safeParse({ userId, password });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldig." };
  try {
    await adminResetPassword(parsed.data.userId, parsed.data.password);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." };
  }
  revalidatePath("/admin");
  return { ok: true };
}
