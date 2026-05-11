"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, Filter, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { useSnelInvoer } from "@/components/snel-invoer/snel-invoer-context";
import type { Klant, Project, Tijdsregistratie } from "@/lib/types";
import { formatUren } from "@/lib/parse-uren";
import { bulkDelete, bulkUpdateFactureerbaar, deleteTijdAction, updateTijdAction } from "./actions";
import { Timer } from "./timer";

type Filter = {
  projectId: string;
  klantId: string;
  factureerbaar: "all" | "yes" | "no";
  gefactureerd: "all" | "yes" | "no";
};

export function UrenView({
  tijden,
  projecten,
  klanten,
  periode,
  van,
  tot,
}: {
  tijden: Tijdsregistratie[];
  projecten: Project[];
  klanten: Klant[];
  periode: string;
  van: string;
  tot: string;
}) {
  const router = useRouter();
  const { open: openSnel } = useSnelInvoer();
  const [filter, setFilter] = useState<Filter>({
    projectId: "all",
    klantId: "all",
    factureerbaar: "all",
    gefactureerd: "all",
  });
  const [editing, setEditing] = useState<Tijdsregistratie | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return tijden.filter((t) => {
      if (filter.projectId !== "all" && t.project_id !== filter.projectId) return false;
      if (filter.klantId !== "all") {
        const p = projecten.find((x) => x.id === t.project_id);
        const klantId = p?.klant_id ?? "__none__";
        if (filter.klantId === "__none__" && klantId !== "__none__") return false;
        if (filter.klantId !== "__none__" && klantId !== filter.klantId) return false;
      }
      if (filter.factureerbaar !== "all" && t.factureerbaar !== (filter.factureerbaar === "yes")) return false;
      if (filter.gefactureerd !== "all" && t.gefactureerd !== (filter.gefactureerd === "yes")) return false;
      return true;
    });
  }, [tijden, filter, projecten]);

  const total = useMemo(() => filtered.reduce((s, t) => s + t.uren, 0), [filtered]);

  function projectInfo(id: string) {
    const p = projecten.find((x) => x.id === id);
    const k = p?.klant_id ? klanten.find((x) => x.id === p.klant_id) : null;
    return { project: p, klant: k };
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  }

  function onPeriodeChange(v: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("periode", v);
    router.push(url.pathname + url.search);
  }
  function onCustomChange(field: "van" | "tot", value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("periode", "custom");
    url.searchParams.set(field, value);
    router.push(url.pathname + url.search);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Timer projecten={projecten.filter((p) => !p.archief)} klanten={klanten} />
          <Button variant="outline" asChild className="gap-2">
            <Link href="/uren/import" aria-label="Importeren">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importeren</span>
            </Link>
          </Button>
          <Button onClick={() => openSnel()} className="hidden sm:inline-flex gap-2">
            Snelle invoer
          </Button>
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Periode</Label>
            <Select value={periode} onValueChange={onPeriodeChange}>
              <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deze-week">Deze week</SelectItem>
                <SelectItem value="deze-maand">Deze maand</SelectItem>
                <SelectItem value="custom">Aangepast</SelectItem>
                <SelectItem value="alles">Alles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periode === "custom" ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Van</Label>
                <Input
                  type="date"
                  value={van}
                  onChange={(e) => onCustomChange("van", e.target.value)}
                  className="w-full md:w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tot</Label>
                <Input
                  type="date"
                  value={tot}
                  onChange={(e) => onCustomChange("tot", e.target.value)}
                  className="w-full md:w-40"
                />
              </div>
            </>
          ) : null}
          <div className="space-y-1">
            <Label className="text-xs">Klant</Label>
            <Select
              value={filter.klantId}
              onValueChange={(v) => setFilter({ ...filter, klantId: v })}
            >
              <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle klanten</SelectItem>
                <SelectItem value="__none__">Persoonlijk / overig</SelectItem>
                {klanten
                  .filter((k) => !k.archief)
                  .map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.naam}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Project</Label>
            <Select
              value={filter.projectId}
              onValueChange={(v) => setFilter({ ...filter, projectId: v })}
            >
              <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle projecten</SelectItem>
                {projecten
                  .filter((p) => !p.archief)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2 md:col-span-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filter.gefactureerd}
              onValueChange={(v) =>
                setFilter({ ...filter, gefactureerd: v as Filter["gefactureerd"] })
              }
            >
              <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alles</SelectItem>
                <SelectItem value="no">Nog niet gefactureerd</SelectItem>
                <SelectItem value="yes">Gefactureerd</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selected.size > 0 ? (
        <BulkBar
          count={selected.size}
          onMarkFactureerbaar={(v) => bulkUpdateFactureerbaar([...selected], v).then(() => { setSelected(new Set()); router.refresh(); })}
          onDelete={() => {
            if (!confirm(`${selected.size} regels verwijderen?`)) return;
            bulkDelete([...selected]).then(() => { setSelected(new Set()); router.refresh(); });
          }}
          onClear={() => setSelected(new Set())}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="h-8 w-8" />}
          title="Geen registraties"
          description="Voeg uren toe via snelle invoer of importeer een .ics-bestand."
          action={<Button onClick={() => openSnel()}>Uren toevoegen</Button>}
        />
      ) : (
        <>
          {/* Mobiel: card-lijst */}
          <div className="md:hidden space-y-2">
            {filtered.length > 1 ? (
              <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <Checkbox
                  checked={selected.size === filtered.length}
                  onCheckedChange={toggleAll}
                />
                Alles selecteren
              </label>
            ) : null}
            {filtered.map((t) => {
              const { project, klant } = projectInfo(t.project_id);
              const isSelected = selected.has(t.id);
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border bg-card p-3 transition-colors border-l-4 ${
                    isSelected ? "ring-2 ring-[var(--brand-ring)]" : ""
                  }`}
                  style={{ borderLeftColor: project?.kleur ?? "var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(t.id)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      aria-label={isSelected ? "Deselecteer" : "Selecteer"}
                    >
                      <span
                        className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ background: project?.kleur ?? "#777" }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium leading-tight">
                            {project?.naam ?? "Onbekend"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {klant?.naam ?? "Persoonlijk"} · {t.datum}
                        </div>
                      </div>
                    </button>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">
                        {formatUren(t.uren)}
                      </div>
                    </div>
                  </div>
                  {t.omschrijving ? (
                    <p className="mt-2 text-sm text-muted-foreground break-words">
                      {t.omschrijving}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {t.gefactureerd ? (
                        <Badge variant="success">Gefactureerd</Badge>
                      ) : t.factureerbaar ? (
                        <Badge variant="soft">Open</Badge>
                      ) : (
                        <Badge variant="muted">Niet factureerbaar</Badge>
                      )}
                      {t.bron !== "handmatig" ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t.bron === "ics_import" ? "ics" : t.bron === "tekst_import" ? "plak" : "ext"}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(t)}
                        aria-label="Bewerken"
                        className="h-9 w-9"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteBtn id={t.id} disabled={t.gefactureerd} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-4 px-1 pt-2 text-sm">
              <span className="text-muted-foreground">{filtered.length} regels</span>
              <span className="font-medium tabular-nums">
                Totaal: {formatUren(total)} u
              </span>
            </div>
          </div>

          {/* Tablet + desktop: tabel */}
          <div className="hidden md:block rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={
                        selected.size === filtered.length && filtered.length > 0
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Uren</TableHead>
                  <TableHead>Omschrijving</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-1" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const { project, klant } = projectInfo(t.project_id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(t.id)}
                          onCheckedChange={() => toggle(t.id)}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">{t.datum}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: project?.kleur ?? "#777" }}
                            aria-hidden
                          />
                          <div>
                            <div className="text-sm font-medium">
                              {project?.naam ?? "Onbekend"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {klant?.naam ?? "Persoonlijk"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUren(t.uren)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {t.omschrijving}
                      </TableCell>
                      <TableCell className="space-x-1">
                        {t.gefactureerd ? (
                          <Badge variant="success">Gefactureerd</Badge>
                        ) : t.factureerbaar ? (
                          <Badge variant="soft">Open</Badge>
                        ) : (
                          <Badge variant="muted">Niet factureerbaar</Badge>
                        )}
                        {t.bron !== "handmatig" ? (
                          <Badge variant="outline">
                            {t.bron === "ics_import"
                              ? "ics"
                              : t.bron === "tekst_import"
                              ? "plak"
                              : "ext"}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(t)}
                          aria-label="Bewerken"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DeleteBtn id={t.id} disabled={t.gefactureerd} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-4 border-t p-3 text-sm">
              <span className="text-muted-foreground">{filtered.length} regels</span>
              <span className="font-medium tabular-nums">
                Totaal: {formatUren(total)} u
              </span>
            </div>
          </div>
        </>
      )}

      <EditSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        tijd={editing}
        projecten={projecten}
        klanten={klanten}
      />
    </>
  );
}

function BulkBar({
  count,
  onMarkFactureerbaar,
  onDelete,
  onClear,
}: {
  count: number;
  onMarkFactureerbaar: (v: boolean) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-[var(--brand-soft)] p-3 text-sm">
      <span className="font-medium">{count} geselecteerd</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onMarkFactureerbaar(true)}>Markeer factureerbaar</Button>
        <Button size="sm" variant="outline" onClick={() => onMarkFactureerbaar(false)}>Markeer niet</Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>Verwijderen</Button>
        <Button size="sm" variant="ghost" onClick={onClear}>Annuleren</Button>
      </div>
    </div>
  );
}

function DeleteBtn({ id, disabled }: { id: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending || disabled}
      title={disabled ? "Zit op factuur" : "Verwijderen"}
      onClick={() => {
        if (!confirm("Registratie verwijderen?")) return;
        start(async () => {
          const r = await deleteTijdAction(id);
          if (!r.ok) toast.error(r.error ?? "Mislukt");
          else {
            toast.success("Verwijderd");
            router.refresh();
          }
        });
      }}
      aria-label="Verwijderen"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function EditSheet({
  open,
  onOpenChange,
  tijd,
  projecten,
  klanten,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  tijd: Tijdsregistratie | null;
  projecten: Project[];
  klanten: Klant[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [datum, setDatum] = useState(tijd?.datum ?? "");
  const [uren, setUren] = useState(tijd ? tijd.uren.toString().replace(".", ",") : "");
  const [projectId, setProjectId] = useState(tijd?.project_id ?? "");
  const [omschrijving, setOmschrijving] = useState(tijd?.omschrijving ?? "");
  const [factureerbaar, setFactureerbaar] = useState(tijd?.factureerbaar ?? true);

  useEffect(() => {
    if (tijd) {
      setDatum(tijd.datum);
      setUren(tijd.uren.toString().replace(".", ","));
      setProjectId(tijd.project_id);
      setOmschrijving(tijd.omschrijving);
      setFactureerbaar(tijd.factureerbaar);
    }
  }, [tijd]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tijd) return;
    start(async () => {
      const r = await updateTijdAction({
        id: tijd.id,
        datum,
        uren,
        project_id: projectId,
        omschrijving,
        factureerbaar,
      });
      if (r.ok) {
        toast.success("Bijgewerkt");
        onOpenChange(false);
        router.refresh();
      } else toast.error(r.error ?? "Opslaan mislukt");
    });
  }

  const klantNaam = (id: string | null) => id ? klanten.find((k) => k.id === id)?.naam ?? "" : "Persoonlijk";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader><SheetTitle>Registratie bewerken</SheetTitle></SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-datum">Datum</Label>
              <Input id="e-datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required disabled={tijd?.gefactureerd} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-uren">Uren</Label>
              <Input id="e-uren" value={uren} onChange={(e) => setUren(e.target.value)} required disabled={tijd?.gefactureerd} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={tijd?.gefactureerd}>
              <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                {projecten.filter((p) => !p.archief || p.id === tijd?.project_id).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.naam} ({klantNaam(p.klant_id)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-omschr">Omschrijving</Label>
            <Textarea id="e-omschr" rows={2} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Factureerbaar</Label>
            <Switch checked={factureerbaar} onCheckedChange={setFactureerbaar} disabled={tijd?.gefactureerd} />
          </div>
          {tijd?.gefactureerd ? (
            <p className="text-sm text-muted-foreground">Deze registratie zit op een factuur en kan niet inhoudelijk worden gewijzigd.</p>
          ) : null}
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Sluiten</Button>
            <Button type="submit" disabled={pending}>{pending ? "Opslaan..." : "Opslaan"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

