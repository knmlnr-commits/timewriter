import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listFacturen } from "@/lib/repo/facturen";
import { listKlanten } from "@/lib/repo/klanten";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

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

export default async function FacturenPage() {
  const user = await requireUser();
  const [facturen, klanten] = await Promise.all([
    listFacturen(user.id),
    listKlanten(user.id),
  ]);
  const klantNaam = (id: string) => klanten.find((k) => k.id === id)?.naam ?? "Onbekend";

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facturen</h1>
          <p className="text-sm text-muted-foreground">Overzicht en status van je facturen</p>
        </div>
        <Button asChild className="gap-2 shrink-0" aria-label="Nieuwe factuur">
          <Link href="/facturen/nieuw">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nieuwe factuur</span>
          </Link>
        </Button>
      </header>

      {facturen.length === 0 ? (
        <EmptyState
          title="Nog geen facturen"
          description="Maak je eerste factuur op basis van geregistreerde uren."
          action={<Button asChild><Link href="/facturen/nieuw">Nieuwe factuur</Link></Button>}
        />
      ) : (
        <>
          {/* Mobiel: card-lijst */}
          <div className="md:hidden space-y-2">
            {facturen.map((f) => (
              <Link
                key={f.id}
                href={`/facturen/${f.id}`}
                className="block rounded-xl border bg-card p-3 active:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{f.factuurnummer}</span>
                      <Badge variant={STATUS_VARIANT[f.status]}>{STATUS_LABEL[f.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{klantNaam(f.klant_id)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {format(new Date(f.factuurdatum), "d MMM yyyy")} &middot;{" "}
                      {f.periode_start} → {f.periode_eind}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums">€ {f.totaal_incl_btw.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">incl. btw</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Tablet+: tabel */}
          <div className="hidden md:block rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturen.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => undefined}>
                    <TableCell className="font-medium">
                      <Link href={`/facturen/${f.id}`} className="hover:underline">
                        {f.factuurnummer}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {format(new Date(f.factuurdatum), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>{klantNaam(f.klant_id)}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {f.periode_start} → {f.periode_eind}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      € {f.totaal_incl_btw.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[f.status]}>{STATUS_LABEL[f.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
