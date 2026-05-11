import { notFound, redirect } from "next/navigation";
import { getSessionUser, isBootstrapAvailable } from "@/lib/auth";
import { isKvConfigured } from "@/lib/kv";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  if (!isKvConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <header className="text-center">
            <h1 className="text-2xl font-semibold">Omgeving niet klaar</h1>
          </header>
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            KV is niet geconfigureerd. De omgeving kan pas worden geactiveerd zodra de
            KV-omgevingsvariabelen zijn gezet.
          </div>
        </div>
      </main>
    );
  }

  // /signup is alleen bereikbaar als de omgeving nog leeg is. Daarna is het
  // beheerbeleid via /admin de enige route om nieuwe accounts aan te maken.
  if (!(await isBootstrapAvailable())) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Omgeving claimen</h1>
          <p className="text-sm text-muted-foreground">
            Deze omgeving is nog leeg. Het eerste account wordt automatisch
            beheerder.
          </p>
        </header>
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
          Daarna kunnen er alleen nog accounts worden aangemaakt via het
          beheerdersscherm. Bewaar je inloggegevens veilig.
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
