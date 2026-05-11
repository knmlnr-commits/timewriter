import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, ReceiptText, Upload } from "lucide-react";
import { getSessionUser, isBootstrapAvailable } from "@/lib/auth";
import { isKvConfigured } from "@/lib/kv";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Clock, title: "Snel uren bijhouden", body: "1-tap snel-invoer met decimaal of uu:mm. Timer voor lopend werk. Werkt ook offline." },
  { icon: Upload, title: "Plakken vanuit Word of Excel", body: "Plak je urenoverzicht in een tekstveld of importeer een .ics-export. Geen overtypen." },
  { icon: ReceiptText, title: "Factuur in 3 stappen", body: "Klant, periode, groeperen. Maakt een nette PDF en Excel met je eigen gegevens." },
  { icon: CheckCircle2, title: "Eigen omgeving", body: "Eigen account, eigen data. Geen abonnement, geen tracking, geen reclame." },
];

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const configured = isKvConfigured();
  const bootstrap = configured ? await isBootstrapAvailable() : false;

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Marketing zijkant - alleen op md+ */}
      <section
        className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-10 lg:p-16 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand) 10%, white) 0%, color-mix(in srgb, var(--brand) 20%, white) 100%)",
        }}
      >
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-30" style={{ background: "var(--brand)" }} />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full opacity-20" style={{ background: "var(--brand)" }} />

        <div className="relative">
          <Logo size="md" />
        </div>

        <div className="relative space-y-8 max-w-xl">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Tijdregistratie{" "}
              <span className="text-[var(--brand)]">zonder gedoe</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Houd je uren bij, beheer klanten en stuur in vijf minuten een
              factuur. Voor freelancers, interim&middot;professionals en
              kleine teams.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Icon className="h-4 w-4 text-[var(--brand)]" />
                </span>
                <div>
                  <h3 className="font-semibold text-sm leading-snug">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-snug">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-muted-foreground">
          time-app.nl &middot; eenvoudig, snel, van jou
        </div>
      </section>

      {/* Login formulier */}
      <section className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Compact logo bovenaan op mobiel */}
          <div className="md:hidden flex justify-center">
            <Logo size="lg" />
          </div>

          <header className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Inloggen</h2>
            <p className="text-sm text-muted-foreground">
              Welkom terug. Pak je uren erbij.
            </p>
          </header>

          {!configured ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Geen KV geconfigureerd. Vul <code>REDIS_URL</code> of <code>KV_REST_API_URL</code> + <code>KV_REST_API_TOKEN</code> in voordat je in kunt loggen.
            </div>
          ) : null}

          <LoginForm />

          {bootstrap ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 text-center">
              Eerste keer hier?{" "}
              <Link href="/signup" className="font-medium underline">
                Claim deze omgeving
              </Link>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Account nodig? Vraag de beheerder.
            </p>
          )}
        </div>

        <p className="md:hidden mt-12 text-xs text-muted-foreground">
          time-app.nl
        </p>
      </section>
    </main>
  );
}
