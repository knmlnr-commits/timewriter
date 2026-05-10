import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { WelkomForm } from "./welkom-form";

export default async function WelkomPage() {
  const user = await requireUser();
  if (user.profile.voltooid) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Welkom bij TijdRegistratie</h1>
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
