import { format, startOfMonth, startOfWeek, endOfMonth, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { requireUser } from "@/lib/auth";
import { listTijden } from "@/lib/repo/tijden";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock } from "lucide-react";
import { DashboardCharts } from "./charts";

type Sums = { uren: number; omzet: number };

function rate(
  projectId: string,
  projecten: { id: string; uurtarief: number | null; klant_id: string | null }[],
  klanten: { id: string; standaard_uurtarief: number | null }[],
  profielTarief: number | null
): number {
  const p = projecten.find((x) => x.id === projectId);
  if (!p) return 0;
  if (p.uurtarief != null) return p.uurtarief;
  if (p.klant_id) {
    const k = klanten.find((x) => x.id === p.klant_id);
    if (k?.standaard_uurtarief != null) return k.standaard_uurtarief;
  }
  return profielTarief ?? 0;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [tijden, projecten, klanten] = await Promise.all([
    listTijden(user.id),
    listProjecten(user.id),
    listKlanten(user.id),
  ]);
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const last30 = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const sums = { vandaag: { uren: 0, omzet: 0 } as Sums, week: { uren: 0, omzet: 0 } as Sums, maand: { uren: 0, omzet: 0 } as Sums };
  const openstaandPerKlant = new Map<string, Sums>();
  let openstaandTotaal: Sums = { uren: 0, omzet: 0 };

  const profielTarief = user.profile.standaard_uurtarief;

  for (const t of tijden) {
    const r = rate(t.project_id, projecten, klanten, profielTarief);
    const omzet = t.uren * r;
    if (t.datum === today) {
      sums.vandaag.uren += t.uren;
      sums.vandaag.omzet += omzet;
    }
    if (t.datum >= weekStart && t.datum <= today) {
      sums.week.uren += t.uren;
      sums.week.omzet += omzet;
    }
    if (t.datum >= monthStart && t.datum <= monthEnd) {
      sums.maand.uren += t.uren;
      sums.maand.omzet += omzet;
    }
    if (t.factureerbaar && !t.gefactureerd) {
      openstaandTotaal.uren += t.uren;
      openstaandTotaal.omzet += omzet;
      const project = projecten.find((p) => p.id === t.project_id);
      const klantId = project?.klant_id ?? "__persoonlijk__";
      const cur = openstaandPerKlant.get(klantId) ?? { uren: 0, omzet: 0 };
      cur.uren += t.uren;
      cur.omzet += omzet;
      openstaandPerKlant.set(klantId, cur);
    }
  }

  const perProjectLaatste30: { naam: string; uren: number; kleur: string }[] = [];
  const perDagLaatste30 = new Map<string, number>();
  for (const t of tijden) {
    if (t.datum < last30) continue;
    perDagLaatste30.set(t.datum, (perDagLaatste30.get(t.datum) ?? 0) + t.uren);
    const project = projecten.find((p) => p.id === t.project_id);
    if (project) {
      const entry = perProjectLaatste30.find((e) => e.naam === project.naam);
      if (entry) entry.uren += t.uren;
      else perProjectLaatste30.push({ naam: project.naam, uren: t.uren, kleur: project.kleur || "var(--brand)" });
    }
  }
  perProjectLaatste30.sort((a, b) => b.uren - a.uren);
  const dailySeries = [...perDagLaatste30.entries()]
    .sort()
    .map(([datum, uren]) => ({ datum, label: format(new Date(datum), "d MMM", { locale: nl }), uren }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vandaag" {...sums.vandaag} />
        <StatCard label="Deze week" {...sums.week} />
        <StatCard label="Deze maand" {...sums.maand} />
        <StatCard label="Openstaand te factureren" {...openstaandTotaal} highlight />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Uren per dag (laatste 30 dagen)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {dailySeries.length === 0 ? (
              <EmptyState icon={<Clock className="h-8 w-8" />} title="Nog geen registraties" description="Voeg je eerste uren toe via de knop rechtsboven." />
            ) : (
              <DashboardCharts type="line" data={dailySeries} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Uren per project (laatste 30 dagen)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {perProjectLaatste30.length === 0 ? (
              <EmptyState title="Geen data" />
            ) : (
              <DashboardCharts type="bar" data={perProjectLaatste30.slice(0, 8)} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Openstaand per klant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {openstaandPerKlant.size === 0 ? (
            <p className="text-sm text-muted-foreground">Geen openstaande uren.</p>
          ) : (
            [...openstaandPerKlant.entries()]
              .sort((a, b) => b[1].omzet - a[1].omzet)
              .map(([klantId, s]) => {
                const klant = klanten.find((k) => k.id === klantId);
                return (
                  <div
                    key={klantId}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="soft">{s.uren.toFixed(2)} u</Badge>
                      <span className="text-sm font-medium">
                        {klant?.naam ?? "Persoonlijk / overig"}
                      </span>
                    </div>
                    <span className="text-sm tabular-nums">€ {s.omzet.toFixed(2)}</span>
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  uren,
  omzet,
  highlight,
}: {
  label: string;
  uren: number;
  omzet: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-[var(--brand)] bg-[var(--brand-soft)]" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tabular-nums">{uren.toFixed(2)} u</div>
        <div className="text-sm text-muted-foreground tabular-nums">€ {omzet.toFixed(2)}</div>
      </CardContent>
    </Card>
  );
}
