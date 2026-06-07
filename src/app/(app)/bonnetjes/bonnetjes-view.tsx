"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { money } from "@/lib/format";
import {
  BONNETJE_CATEGORIEEN,
  BONNETJE_CATEGORIE_LABEL,
  type Bonnetje,
  type BonnetjeCategorie,
  type Klant,
} from "@/lib/types";

const CATEGORIE_TINT: Record<BonnetjeCategorie, string> = {
  reiskosten: "var(--tint-blue-fg)",
  horeca: "var(--tint-orange-fg)",
  kantoor: "var(--tint-teal-fg)",
  software: "var(--tint-purple-fg)",
  telefoon_internet: "var(--tint-pink-fg)",
  marketing: "var(--brand)",
  opleiding: "var(--tint-green-fg)",
  representatie: "var(--tint-pink-fg)",
  overig: "var(--muted-foreground)",
};

export function BonnetjesView({
  bonnetjes,
  klanten,
  periode,
  van,
  tot,
}: {
  bonnetjes: Bonnetje[];
  klanten: Klant[];
  periode: string;
  van: string;
  tot: string;
}) {
  const router = useRouter();
  const [categorie, setCategorie] = useState<"all" | BonnetjeCategorie>("all");

  const filtered = useMemo(
    () => bonnetjes.filter((b) => categorie === "all" || b.categorie === categorie),
    [bonnetjes, categorie]
  );

  const totaal = useMemo(() => filtered.reduce((s, b) => s + (b.bedrag || 0), 0), [filtered]);
  const totaalBtw = useMemo(
    () => filtered.reduce((s, b) => s + (b.btw_bedrag || 0), 0),
    [filtered]
  );

  function onPeriodeChange(v: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("periode", v);
    router.push(url.pathname + url.search);
  }

  function klantNaam(id: string | null) {
    if (!id) return null;
    return klanten.find((k) => k.id === id)?.naam ?? null;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Periode</Label>
          <Select value={periode} onValueChange={onPeriodeChange}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deze-maand">Deze maand</SelectItem>
              <SelectItem value="vorige-maand">Vorige maand</SelectItem>
              <SelectItem value="alles">Alles</SelectItem>
              <SelectItem value="custom">Aangepast</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periode === "custom" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Van</Label>
              <Input type="date" defaultValue={van} readOnly className="w-full md:w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tot</Label>
              <Input type="date" defaultValue={tot} readOnly className="w-full md:w-40" />
            </div>
          </>
        ) : null}
        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label className="text-xs">Categorie</Label>
          <Select
            value={categorie}
            onValueChange={(v) => setCategorie(v as "all" | BonnetjeCategorie)}
          >
            <SelectTrigger className="w-full md:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle categorieën</SelectItem>
              {BONNETJE_CATEGORIEEN.map((c) => (
                <SelectItem key={c} value={c}>
                  {BONNETJE_CATEGORIE_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobiel: card-lijst */}
      <div className="md:hidden space-y-2">
        {filtered.map((b) => (
          <Link
            key={b.id}
            href={`/bonnetjes/${b.id}`}
            className="block rounded-xl border bg-card p-3 active:bg-accent transition-colors border-l-4"
            style={{ borderLeftColor: CATEGORIE_TINT[b.categorie] }}
          >
            <div className="flex items-start gap-3">
              {b.foto_data ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.foto_data}
                  alt=""
                  className="h-14 w-14 rounded-md object-cover border shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-md bg-muted shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                  geen foto
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{b.leverancier || "—"}</span>
                  {b.bron === "foto_ai" ? (
                    <Sparkles className="h-3 w-3 text-[var(--brand)]" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {BONNETJE_CATEGORIE_LABEL[b.categorie]} · {b.datum}
                </p>
                {b.omschrijving ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">{b.omschrijving}</p>
                ) : null}
                {klantNaam(b.klant_id) ? (
                  <p className="text-xs text-muted-foreground">
                    Doorbelast: {klantNaam(b.klant_id)}
                  </p>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold tabular-nums">{money(b.bedrag)}</div>
                {b.btw_bedrag != null ? (
                  <div className="text-xs text-muted-foreground">
                    btw {money(b.btw_bedrag)}
                  </div>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: tabel */}
      <div className="hidden md:block rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Leverancier</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Doorbelast aan</TableHead>
              <TableHead className="text-right">Bedrag</TableHead>
              <TableHead className="text-right">BTW</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="tabular-nums">{b.datum}</TableCell>
                <TableCell>
                  <Link href={`/bonnetjes/${b.id}`} className="hover:underline font-medium">
                    {b.leverancier || "—"}
                  </Link>
                  {b.bron === "foto_ai" ? (
                    <Sparkles className="ml-1 inline-block h-3 w-3 text-[var(--brand)]" />
                  ) : null}
                  {b.omschrijving ? (
                    <div className="text-xs text-muted-foreground">{b.omschrijving}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    style={{ borderColor: CATEGORIE_TINT[b.categorie], color: CATEGORIE_TINT[b.categorie] }}
                  >
                    {BONNETJE_CATEGORIE_LABEL[b.categorie]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {klantNaam(b.klant_id) ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(b.bedrag)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.btw_bedrag != null ? money(b.btw_bedrag) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end gap-4 border-t p-3 text-sm">
          <span className="text-muted-foreground">{filtered.length} regels</span>
          <span className="text-muted-foreground">
            BTW: <span className="font-medium tabular-nums">{money(totaalBtw)}</span>
          </span>
          <span className="font-medium tabular-nums">Totaal: {money(totaal)}</span>
        </div>
      </div>

      {/* Mobiel: totalen onder de cards */}
      <div className="md:hidden flex items-center justify-between gap-4 px-1 pt-2 text-sm">
        <span className="text-muted-foreground">{filtered.length} regels</span>
        <span className="font-medium tabular-nums">Totaal: {money(totaal)}</span>
      </div>
    </div>
  );
}
