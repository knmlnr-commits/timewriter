"use server";

import { redirect } from "next/navigation";
import { login, setSessionCookie } from "@/lib/auth";

export async function loginAction(_: unknown, formData: FormData): Promise<{ error?: string } | void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const token = await login(email, password);
    await setSessionCookie(token);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Inloggen mislukt." };
  }
  redirect("/dashboard");
}
