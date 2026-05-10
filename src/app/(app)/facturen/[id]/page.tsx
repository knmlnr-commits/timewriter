import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, FileDown, FileSpreadsheet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFactuur } from "@/lib/repo/facturen";
import { getKlant } from "@/lib/repo/klanten";
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
import { FactuurActions } from "./actions-ui";

const STATUS_VARIANT = {
  concept: "muted",
  verzonden: "soft",
  betaald: "success",
  geannuleerd: "destructive",
} as const;

const STATUS_LABEL = {
  concept: "Concept",
  verzonden: "Verzonden",
  betaald: "Betaald",
  geannuleerd: "Geannuleerd",
} as const;

export default async function FactuurPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const factuur = await getFactuur(user.id, id);
  if (!factuur) notFound();
  const klant = await getKlant(user.id, factuur.klant_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link href="/facturen"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Factuur {factuur.factuurnummer}</h1>
            <p className="text-sm text-muted-foreground">
              {klant?.naam ?? "Onbekende klant"} ·{" "}
              {format(new Date(factuur.factuurdatum), "d MMMM yyyy", { locale: nl })}
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

      <Card>
        <CardHeader>
          <CardTitle>Regels</CardTitle>
        </CardHeader>
        <CardContent>
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
              {factuur.regels.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.omschrijving}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.aantal_uren.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {r.uurtarief.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {r.bedrag.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 grid grid-cols-2 gap-1 text-sm md:max-w-sm md:ml-auto">
            <span className="text-muted-foreground">Subtotaal</span>
            <span className="text-right tabular-nums">€ {factuur.totaal_excl_btw.toFixed(2)}</span>
            <span className="text-muted-foreground">BTW ({factuur.btw_percentage}%)</span>
            <span className="text-right tabular-nums">€ {factuur.btw_bedrag.toFixed(2)}</span>
            <span className="font-semibold">Totaal</span>
            <span className="text-right font-semibold tabular-nums">€ {factuur.totaal_incl_btw.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Periode">
            {factuur.periode_start} t/m {factuur.periode_eind}
          </Row>
          <Row label="Vervaldatum">{format(new Date(factuur.vervaldatum), "d MMMM yyyy", { locale: nl })}</Row>
          {factuur.verzonden_op ? (
            <Row label="Verzonden">{format(new Date(factuur.verzonden_op), "d MMMM yyyy HH:mm", { locale: nl })}</Row>
          ) : null}
          {factuur.betaald_op ? (
            <Row label="Betaald">{format(new Date(factuur.betaald_op), "d MMMM yyyy HH:mm", { locale: nl })}</Row>
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
