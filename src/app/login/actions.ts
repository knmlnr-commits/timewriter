"use server";

import { redirect } from "next/navigation";
import { login, setSessionCookie } from "@/lib/auth";

export async function loginAction(_: unknown, formData: FormData): Promise<{ error?: string } | void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "1";
  try {
    const token = await login(email, password);
    // remember=true → 30-dagen persistente cookie (default).
    // remember=false → session cookie, weg zodra de browser sluit.
    await setSessionCookie(token, { persistent: remember });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Inloggen mislukt." };
  }
  redirect("/dashboard");
}
