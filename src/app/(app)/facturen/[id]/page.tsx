import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFactuur } from "@/lib/repo/facturen";
import { getKlant } from "@/lib/repo/klanten";
import { money, numFixed, percent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FactuurActions, UrenBijlageToggle } from "./actions-ui";

const STATUS_VARIANT = {
  concept: "muted",
  verzonden: "info",
  betaald: "success",
  geannuleerd: "destructive",
} as const;

const STATUS_LABEL = {
  concept: "Concept",
  verzonden: "Verzonden",
  betaald: "Betaald",
  geannuleerd: "Geannuleerd",
} as const;

export const dynamic = "force-dynamic";

function safeDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmtDate(value: unknown, pattern = "d MMMM yyyy"): string {
  const d = safeDate(value);
  return d ? format(d, pattern, { locale: nl }) : "—";
}

export default async function FactuurPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const factuur = await getFactuur(user.id, id);
  if (!factuur) notFound();
  const klant = await getKlant(user.id, factuur.klant_id);
  const regels = Array.isArray(factuur.regels) ? factuur.regels : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link href="/facturen"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Factuur {factuur.factuurnummer}</h1>
            <p className="text-sm text-muted-foreground">
              {klant?.naam ?? "Onbekende klant"} &middot; {fmtDate(factuur.factuurdatum)}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[factuur.status]}>{STATUS_LABEL[factuur.status]}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="gap-2">
          <a href={`/facturen/${factuur.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <FileDown className="h-4 w-4" /> PDF
          </a>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <a href={`/facturen/${factuur.id}/xlsx`}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </a>
        </Button>
        <FactuurActions id={factuur.id} status={factuur.status} />
      </div>

      <UrenBijlageToggle
        id={factuur.id}
        initialEnabled={Boolean(factuur.include_uren_bijlage)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Regels</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobiel: regel-cards */}
          <div className="md:hidden space-y-2">
            {regels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen regels.</p>
            ) : (
              regels.map((r, i) => (
                <div key={i} className="rounded-md border p-3 space-y-1">
                  <p className="text-sm font-medium">{r.omschrijving || "—"}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {numFixed(r.aantal_uren)} u &middot; {money(r.uurtarief)}/u
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {money(r.bedrag)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tablet+: tabel */}
          <div className="hidden md:block">
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
                {regels.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.omschrijving || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{numFixed(r.aantal_uren)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.uurtarief)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.bedrag)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 text-sm md:max-w-sm md:ml-auto">
            <span className="text-muted-foreground">Subtotaal</span>
            <span className="text-right tabular-nums">{money(factuur.totaal_excl_btw)}</span>
            <span className="text-muted-foreground">BTW ({percent(factuur.btw_percentage)})</span>
            <span className="text-right tabular-nums">{money(factuur.btw_bedrag)}</span>
            <span className="font-semibold">Totaal</span>
            <span className="text-right font-semibold tabular-nums">{money(factuur.totaal_incl_btw)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Periode">
            {factuur.periode_start || "—"} t/m {factuur.periode_eind || "—"}
          </Row>
          <Row label="Vervaldatum">{fmtDate(factuur.vervaldatum)}</Row>
          {factuur.verzonden_op ? (
            <Row label="Verzonden">{fmtDate(factuur.verzonden_op, "d MMMM yyyy HH:mm")}</Row>
          ) : null}
          {factuur.betaald_op ? (
            <Row label="Betaald">{fmtDate(factuur.betaald_op, "d MMMM yyyy HH:mm")}</Row>
          ) : null}
          {factuur.notities ? <Row label="Notities">{factuur.notities}</Row> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
