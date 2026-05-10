"use server";

import { redirect } from "next/navigation";
import { setSessionCookie, signup } from "@/lib/auth";

export async function signupAction(_: unknown, formData: FormData): Promise<{ error?: string } | void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const naam = String(formData.get("naam") ?? "");
  if (!naam.trim()) return { error: "Naam is verplicht." };
  try {
    const { token } = await signup({ email, password, naam });
    await setSessionCookie(token);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Account aanmaken mislukt." };
  }
  redirect("/welkom");
}
