import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isKvConfigured } from "@/lib/kv";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Account aanmaken</h1>
          <p className="text-sm text-muted-foreground">Eigen account, eigen data</p>
        </header>
        {!isKvConfigured() ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            KV is niet geconfigureerd. Accounts kunnen pas worden aangemaakt zodra de KV-omgevingsvariabelen zijn gezet.
          </div>
        ) : (
          <SignupForm />
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
