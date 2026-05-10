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
        <Button asChild className="gap-2"><Link href="/facturen/nieuw"><Plus className="h-4 w-4" /> Nieuwe factuur</Link></Button>
      </header>

      {facturen.length === 0 ? (
        <EmptyState
          title="Nog geen facturen"
          description="Maak je eerste factuur op basis van geregistreerde uren."
          action={<Button asChild><Link href="/facturen/nieuw">Nieuwe factuur</Link></Button>}
        />
      ) : (
        <div className="rounded-xl border bg-card">
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
                    <Link href={`/facturen/${f.id}`} className="hover:underline">{f.factuurnummer}</Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{format(new Date(f.factuurdatum), "d MMM yyyy")}</TableCell>
                  <TableCell>{klantNaam(f.klant_id)}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{f.periode_start} → {f.periode_eind}</TableCell>
                  <TableCell className="text-right tabular-nums">€ {f.totaal_incl_btw.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[f.status]}>{STATUS_LABEL[f.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
