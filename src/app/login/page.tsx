import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquareText, Sparkles, Upload, Zap } from "lucide-react";
import { getSessionUser, isBootstrapAvailable } from "@/lib/auth";
import { isKvConfigured } from "@/lib/kv";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Chat in plaats van forms",
    body: "Vertel de AI in normaal Nederlands wat je deze week deed. Hij vult de uren in en jij bevestigt.",
  },
  {
    icon: Sparkles,
    title: "Patronen leren",
    body: "Stel eenmaal je standaard week in. De AI begint elke week vanaf die basis en vraagt alleen naar afwijkingen.",
  },
  {
    icon: Upload,
    title: "Of plak een tabel",
    body: "Voorkeur voor old-school? Plak een Excel- of Word-tabel en de parser zet het om.",
  },
  {
    icon: Zap,
    title: "Eind van de maand: factuur in 3 stappen",
    body: "Klant kiezen, periode kiezen, PDF en Excel rollen eruit. Met urendetail als bijlage indien gewenst.",
  },
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

        <div className="relative flex items-center justify-between">
          <Logo size="md" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--brand)] shadow-sm backdrop-blur">
            <Sparkles className="h-3 w-3" />
            AI-native
          </span>
        </div>

        <div className="relative space-y-8 max-w-xl">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Urenadmin?{" "}
              <span className="text-[var(--brand)]">Doen wij wel</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Praat met onze AI, factuur is klaar. Jij gaat door met het echte
              werk. Voorbeeld:{" "}
              <span className="italic">
                &ldquo;maandag standaard, dinsdag vrij, woensdag 6 uur Project X&rdquo;
              </span>{" "}
              — onze bot vult de rest in en jij bevestigt met één tap.
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
          time-app.nl &middot; de admin doen wij, jij hoeft alleen te vertellen
        </div>
      </section>

      {/* Login formulier */}
      <section className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Compact logo + AI-badge bovenaan op mobiel */}
          <div className="md:hidden flex flex-col items-center gap-3">
            <Logo size="lg" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]">
              <Sparkles className="h-3 w-3" />
              AI-native urenregistratie
            </span>
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
