import { redirect } from "next/navigation";
import { getSessionUser, isBootstrapAvailable } from "@/lib/auth";
import { isKvConfigured } from "@/lib/kv";
import { LoginForm } from "./login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const configured = isKvConfigured();
  const bootstrap = configured ? await isBootstrapAvailable() : false;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">TijdRegistratie</h1>
          <p className="text-sm text-muted-foreground">Log in op je account</p>
        </header>
        {!configured ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Geen KV geconfigureerd. Vul <code>REDIS_URL</code> of <code>KV_REST_API_URL</code> +{" "}
            <code>KV_REST_API_TOKEN</code> in voordat je in kunt loggen.
          </div>
        ) : null}
        <LoginForm />
        {bootstrap ? (
          <p className="text-center text-sm text-muted-foreground">
            Eerste keer hier?{" "}
            <Link href="/signup" className="text-[var(--brand)] hover:underline">
              Omgeving claimen
            </Link>
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Account nodig? Vraag de beheerder.
          </p>
        )}
      </div>
    </main>
  );
}
