import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { WelkomForm } from "./welkom-form";

export default async function WelkomPage() {
  const user = await requireUser();
  if (user.profile.voltooid) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welkom</h1>
          <p className="text-sm text-muted-foreground">
            Even de basis instellen. De rest kan later in je profiel.
          </p>
        </header>
        <WelkomForm
          defaultNaam={user.profile.naam}
          defaultUurtarief={user.profile.standaard_uurtarief}
          defaultAccent={user.profile.accent_kleur}
        />
      </div>
    </main>
  );
}
