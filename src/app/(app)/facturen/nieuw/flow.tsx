"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Klant, Project, Tijdsregistratie } from "@/lib/types";
import { generateFactuurAction } from "../actions";

type Groep = "project" | "dag" | "plat";

type Regel = {
  omschrijving: string;
  aantal_uren: number;
  uurtarief: number;
  bedrag: number;
  tijd_ids: string[];
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function NieuweFactuurFlow({
  klanten,
  projecten,
  tijden,
  initialKlant,
  initialVan,
  initialTot,
  profielTarief,
}: {
  klanten: Klant[];
  projecten: Project[];
  tijden: Tijdsregistratie[];
  initialKlant: string | null;
  initialVan: string;
  initialTot: string;
  profielTarief: number | null;
}) {
  const router = useRouter();
  const [klantId, setKlantId] = useState<string>(initialKlant ?? "");
  const [van, setVan] = useState(initialVan);
  const [tot, setTot] = useState(initialTot);
  const [factuurdatum, setFactuurdatum] = useState(format(new Date(), "yyyy-MM-dd"));
  const [groep, setGroep] = useState<Groep>("project");
  const [notities, setNotities] = useState("");
  const [regels, setRegels] = useState<Regel[]>([]);
  const [pending, start] = useTransition();
  const [generated, setGenerated] = useState(false);

  const klant = klanten.find((k) => k.id === klantId);

  function refreshPeriod(field: "van" | "tot", value: string) {
    if (field === "van") setVan(value);
    else setTot(value);
    const url = new URL(window.location.href);
    if (klantId) url.searchParams.set("klant", klantId);
    url.searchParams.set(field, value);
    router.replace(url.pathname + url.search);
  }

  const kandidaten = useMemo(() => {
    if (!klantId) return [];
    const projectIds = new Set(projecten.filter((p) => p.klant_id === klantId).map((p) => p.id));
    return tijden.filter(
      (t) => projectIds.has(t.project_id) && t.factureerbaar && !t.gefactureerd
    );
  }, [tijden, projecten, klantId]);

  function tariefForProject(projectId: string): number {
    const p = projecten.find((x) => x.id === projectId);
    if (p?.uurtarief != null) return p.uurtarief;
    if (klant?.standaard_uurtarief != null) return klant.standaard_uurtarief;
    return profielTarief ?? 0;
  }

  function buildRegels() {
    if (kandidaten.length === 0) {
      toast.error("Geen factureerbare uren in deze periode voor deze klant.");
      return;
    }
    if (groep === "project") {
      const byProject = new Map<string, Tijdsregistratie[]>();
      for (const t of kandidaten) {
        const arr = byProject.get(t.project_id) ?? [];
        arr.push(t);
        byProject.set(t.project_id, arr);
      }
      const next: Regel[] = [];
      for (const [pid, rows] of byProject.entries()) {
        const project = projecten.find((p) => p.id === pid);
        const aantal = round2(rows.reduce((s, r) => s + r.uren, 0));
        const tarief = tariefForProject(pid);
        next.push({
          omschrijving: project?.naam ?? "Werkzaamheden",
          aantal_uren: aantal,
          uurtarief: tarief,
          bedrag: round2(aantal * tarief),
          tijd_ids: rows.map((r) => r.id),
        });
      }
      setRegels(next);
    } else if (groep === "dag") {
      const byDag = new Map<string, Tijdsregistratie[]>();
      for (const t of kandidaten) {
        const k = `${t.datum}|${t.project_id}`;
        const arr = byDag.get(k) ?? [];
        arr.push(t);
        byDag.set(k, arr);
      }
      const next: Regel[] = [];
      for (const [key, rows] of [...byDag.entries()].sort()) {
        const [datum, pid] = key.split("|");
        const project = projecten.find((p) => p.id === pid);
        const aantal = round2(rows.reduce((s, r) => s + r.uren, 0));
        const tarief = tariefForProject(pid);
        next.push({
          omschrijving: `${datum} — ${project?.naam ?? ""}`,
          aantal_uren: aantal,
          uurtarief: tarief,
          bedrag: round2(aantal * tarief),
          tijd_ids: rows.map((r) => r.id),
        });
      }
      setRegels(next);
    } else {
      const next: Regel[] = kandidaten
        .sort((a, b) => a.datum.localeCompare(b.datum))
        .map((t) => {
          const project = projecten.find((p) => p.id === t.project_id);
          const tarief = tariefForProject(t.project_id);
          return {
            omschrijving: t.omschrijving || project?.naam || "Werkzaamheden",
            aantal_uren: t.uren,
            uurtarief: tarief,
            bedrag: round2(t.uren * tarief),
            tijd_ids: [t.id],
          };
        });
      setRegels(next);
    }
    setGenerated(true);
  }

  function updateRegel(idx: number, patch: Partial<Regel>) {
    setRegels((rs) =>
      rs.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        next.aantal_uren = Number(next.aantal_uren);
        next.uurtarief = Number(next.uurtarief);
        next.bedrag = round2(next.aantal_uren * next.uurtarief);
        return next;
      })
    );
  }

  const totaalExcl = round2(regels.reduce((s, r) => s + r.bedrag, 0));
  const btwPercentage = klant?.btw_percentage ?? 21;
  const btwBedrag = round2(totaalExcl * (btwPercentage / 100));
  const totaalIncl = round2(totaalExcl + btwBedrag);
  const alleTijdIds = useMemo(() => [...new Set(regels.flatMap((r) => r.tijd_ids))], [regels]);

  function submit() {
    if (!klant) return;
    start(async () => {
      const r = await generateFactuurAction({
        klant_id: klant.id,
        periode_start: van,
        periode_eind: tot,
        factuurdatum,
        notities,
        regels,
        tijd_ids: alleTijdIds,
      });
      if (!r.ok || !r.id) {
        toast.error(r.error ?? "Genereren mislukt");
        return;
      }
      toast.success("Factuur aangemaakt");
      router.push(`/facturen/${r.id}`);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stap 1: klant en periode</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Klant</Label>
            <Select value={klantId} onValueChange={(v) => { setKlantId(v); setGenerated(false); }}>
              <SelectTrigger><SelectValue placeholder="Kies klant" /></SelectTrigger>
              <SelectContent>
                {klanten.map((k) => <SelectItem key={k.id} value={k.id}>{k.naam}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Van</Label>
            <Input type="date" value={van} onChange={(e) => { refreshPeriod("van", e.target.value); setGenerated(false); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Tot</Label>
            <Input type="date" value={tot} onChange={(e) => { refreshPeriod("tot", e.target.value); setGenerated(false); }} />
          </div>
        </CardContent>
      </Card>

      {klantId ? (
        <Card>
          <CardHeader>
            <CardTitle>Stap 2: groepering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Groeperen op</Label>
                <Select value={groep} onValueChange={(v) => setGroep(v as Groep)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Per project</SelectItem>
                    <SelectItem value="dag">Per dag (per project)</SelectItem>
                    <SelectItem value="plat">Plat (één regel per registratie)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Factuurdatum</Label>
                <Input type="date" value={factuurdatum} onChange={(e) => setFactuurdatum(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span>
                <span className="font-medium">{kandidaten.length}</span> factureerbare, niet-gefactureerde registraties · totaal{" "}
                <span className="font-medium tabular-nums">
                  {round2(kandidaten.reduce((s, t) => s + t.uren, 0))} u
                </span>
              </span>
              <Button onClick={buildRegels} disabled={kandidaten.length === 0}>Regels samenstellen</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {generated ? (
        <Card>
          <CardHeader>
            <CardTitle>Stap 3: regels bewerken</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="w-24 text-right">Uren</TableHead>
                    <TableHead className="w-28 text-right">Uurtarief</TableHead>
                    <TableHead className="w-28 text-right">Bedrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regels.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input value={r.omschrijving} onChange={(e) => updateRegel(idx, { omschrijving: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.aantal_uren}
                          onChange={(e) => updateRegel(idx, { aantal_uren: Number(e.target.value) })}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.uurtarief}
                          onChange={(e) => updateRegel(idx, { uurtarief: Number(e.target.value) })}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">€ {r.bedrag.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notities">Notities op de factuur (optioneel)</Label>
              <Textarea id="notities" rows={2} value={notities} onChange={(e) => setNotities(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-1 text-sm md:max-w-sm md:ml-auto">
              <span className="text-muted-foreground">Subtotaal</span>
              <span className="text-right tabular-nums">€ {totaalExcl.toFixed(2)}</span>
              <span className="text-muted-foreground">BTW ({btwPercentage}%)</span>
              <span className="text-right tabular-nums">€ {btwBedrag.toFixed(2)}</span>
              <span className="font-semibold">Totaal</span>
              <span className="text-right font-semibold tabular-nums">€ {totaalIncl.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Badge variant="muted">Concept</Badge>
              <Button onClick={submit} disabled={pending || regels.length === 0}>
                {pending ? "Genereren..." : "Factuur genereren"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
