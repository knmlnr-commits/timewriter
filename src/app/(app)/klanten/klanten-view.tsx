"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { Klant } from "@/lib/types";
import { deleteKlantAction, saveKlantAction, toggleArchiefKlant } from "./actions";

export function KlantenView({ klanten }: { klanten: Klant[] }) {
  const [tab, setTab] = useState<"actief" | "archief">("actief");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Klant | "new" | null>(null);

  const filtered = useMemo(() => {
    return klanten.filter((k) => {
      if ((tab === "actief") === k.archief) return false;
      if (q && !`${k.naam} ${k.factuur_email} ${k.factuur_plaats}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [klanten, q, tab]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="actief">Actief</TabsTrigger>
            <TabsTrigger value="archief">Archief</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoeken..."
              className="pl-8 w-56"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button onClick={() => setEditing("new")} className="gap-2">
            <Plus className="h-4 w-4" /> Nieuwe klant
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === "actief" ? "Nog geen klanten" : "Geen gearchiveerde klanten"}
          description={tab === "actief" ? "Voeg je eerste klant toe om te kunnen factureren." : undefined}
          action={tab === "actief" ? <Button onClick={() => setEditing("new")}>Nieuwe klant</Button> : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Plaats</TableHead>
                <TableHead>Uurtarief</TableHead>
                <TableHead>BTW</TableHead>
                <TableHead>Termijn</TableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {k.naam}
                      {k.archief ? <Badge variant="muted">Archief</Badge> : null}
                    </div>
                    {k.factuur_email ? (
                      <div className="text-xs text-muted-foreground">{k.factuur_email}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{k.factuur_plaats || "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {k.standaard_uurtarief != null ? `€ ${k.standaard_uurtarief.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>{k.btw_percentage}%</TableCell>
                  <TableCell>{k.betaaltermijn_dagen} d</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <RowActions klant={k} onEdit={() => setEditing(k)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <KlantSheet
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        klant={editing === "new" ? null : editing}
      />
    </>
  );
}

function RowActions({ klant, onEdit }: { klant: Klant; onEdit: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Bewerken">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await toggleArchiefKlant(klant.id, !klant.archief);
            toast.success(klant.archief ? "Hersteld" : "Gearchiveerd");
          })
        }
        aria-label={klant.archief ? "Herstellen" : "Archiveren"}
      >
        {klant.archief ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Klant "${klant.naam}" definitief verwijderen?`)) return;
          start(async () => {
            const r = await deleteKlantAction(klant.id);
            if (!r.ok) toast.error(r.error ?? "Verwijderen mislukt");
            else toast.success("Klant verwijderd");
          });
        }}
        aria-label="Verwijderen"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function KlantSheet({
  open,
  onOpenChange,
  klant,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  klant: Klant | null;
}) {
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await saveKlantAction(klant?.id ?? null, fd);
      if (r.ok) {
        toast.success(klant ? "Klant bijgewerkt" : "Klant aangemaakt");
        onOpenChange(false);
      } else toast.error(r.error ?? "Opslaan mislukt");
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{klant ? "Klant bewerken" : "Nieuwe klant"}</SheetTitle>
          <SheetDescription>Factuurgegevens en standaardtarief</SheetDescription>
        </SheetHeader>
        <form key={klant?.id ?? "new"} onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="naam">Naam</Label>
            <Input id="naam" name="naam" defaultValue={klant?.naam ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="factuur_email">Factuur-e-mail</Label>
            <Input id="factuur_email" name="factuur_email" type="email" defaultValue={klant?.factuur_email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="factuur_adres">Adres</Label>
            <Input id="factuur_adres" name="factuur_adres" defaultValue={klant?.factuur_adres ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="factuur_postcode">Postcode</Label>
              <Input id="factuur_postcode" name="factuur_postcode" defaultValue={klant?.factuur_postcode ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="factuur_plaats">Plaats</Label>
              <Input id="factuur_plaats" name="factuur_plaats" defaultValue={klant?.factuur_plaats ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="standaard_uurtarief">Uurtarief (€)</Label>
              <Input
                id="standaard_uurtarief"
                name="standaard_uurtarief"
                type="number"
                step="0.01"
                min="0"
                defaultValue={klant?.standaard_uurtarief ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="btw_percentage">BTW %</Label>
              <Input
                id="btw_percentage"
                name="btw_percentage"
                type="number"
                step="0.5"
                min="0"
                max="100"
                defaultValue={klant?.btw_percentage ?? 21}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="betaaltermijn_dagen">Termijn (d)</Label>
              <Input
                id="betaaltermijn_dagen"
                name="betaaltermijn_dagen"
                type="number"
                min="0"
                defaultValue={klant?.betaaltermijn_dagen ?? 30}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notities">Notities</Label>
            <Textarea id="notities" name="notities" rows={3} defaultValue={klant?.notities ?? ""} />
          </div>
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={pending}>{pending ? "Opslaan..." : "Opslaan"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
