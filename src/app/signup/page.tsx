import Link from "next/link";
import { redirect } from "next/navigation";
import { getKv } from "@/lib/kv";
import { getSessionUser } from "@/lib/auth";
import { KEYS } from "@/lib/keys";
import { SignupForm } from "./signup-form";

type Gate =
  | { mode: "kv-absent" }
  | { mode: "open"; bootstrap: boolean }
  | { mode: "allowlist" }
  | { mode: "closed" };

async function determineGate(): Promise<Gate> {
  const kv = getKv();
  if (kv.driver === "absent") return { mode: "kv-absent" };

  const userIds = await kv.smembers(KEYS.usersIndex());
  if (userIds.length === 0) return { mode: "open", bootstrap: true };

  const allow = process.env.SIGNUP_ALLOWLIST?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow && allow.length > 0) return { mode: "allowlist" };

  return { mode: "closed" };
}

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const gate = await determineGate();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Account aanmaken</h1>
          <p className="text-sm text-muted-foreground">Eigen account, eigen data</p>
        </header>

        {gate.mode === "kv-absent" ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            KV is niet geconfigureerd. Accounts kunnen pas worden aangemaakt zodra de KV-omgevingsvariabelen zijn gezet.
          </div>
        ) : gate.mode === "closed" ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-medium">Aanmaken van nieuwe accounts is uitgeschakeld.</p>
            <p className="mt-1">
              Dit is een afgesloten omgeving. Vraag de beheerder om je e-mailadres op de
              uitnodigingslijst te zetten.
            </p>
          </div>
        ) : (
          <>
            {gate.mode === "open" && gate.bootstrap ? (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                Eerste account voor deze omgeving. Daarna staat aanmaken standaard uit.
              </div>
            ) : null}
            {gate.mode === "allowlist" ? (
              <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
                Aanmaken is beperkt tot e-mailadressen op de uitnodigingslijst.
              </div>
            ) : null}
            <SignupForm />
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Al een account?{" "}
          <Link href="/login" className="text-[var(--brand)] hover:underline">
            Inloggen
          </Link>
        </p>
      </div>
    </main>
  );
}
