"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { Klant, Project } from "@/lib/types";
import { deleteProjectAction, saveProjectAction, toggleArchiefProject } from "./actions";

const PROJECT_COLORS = [
  "#E8732A", "#2563EB", "#16A34A", "#7C3AED", "#0D9488", "#DB2777", "#52525B",
];

export function ProjectenView({ projecten, klanten }: { projecten: Project[]; klanten: Klant[] }) {
  const [tab, setTab] = useState<"actief" | "archief">("actief");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Project | "new" | null>(null);

  const klantNaam = (id: string | null) =>
    id ? klanten.find((k) => k.id === id)?.naam ?? "Onbekend" : "Persoonlijk";

  const filtered = useMemo(() => {
    return projecten.filter((p) => {
      if ((tab === "actief") === p.archief) return false;
      const haystack = `${p.naam} ${klantNaam(p.klant_id)} ${p.omschrijving}`.toLowerCase();
      if (q && !haystack.includes(q.toLowerCase())) return false;
      return true;
    });
  }, [projecten, q, tab, klantNaam]);

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
            <Plus className="h-4 w-4" /> Nieuw project
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === "actief" ? "Nog geen projecten" : "Geen gearchiveerde projecten"}
          description="Een project hoort bij een klant of is persoonlijk (geen klant)."
          action={tab === "actief" ? <Button onClick={() => setEditing("new")}>Nieuw project</Button> : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Uurtarief</TableHead>
                <TableHead>Factureerbaar</TableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: p.kleur }}
                        aria-hidden
                      />
                      {p.naam}
                      {p.archief ? <Badge variant="muted">Archief</Badge> : null}
                    </div>
                    {p.omschrijving ? (
                      <div className="text-xs text-muted-foreground">{p.omschrijving}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{klantNaam(p.klant_id)}</TableCell>
                  <TableCell className="tabular-nums">
                    {p.uurtarief != null ? `€ ${p.uurtarief.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>{p.factureerbaar ? <Badge variant="soft">Ja</Badge> : <Badge variant="muted">Nee</Badge>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <RowActions project={p} onEdit={() => setEditing(p)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectSheet
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        project={editing === "new" ? null : editing}
        klanten={klanten}
      />
    </>
  );
}

function RowActions({ project, onEdit }: { project: Project; onEdit: () => void }) {
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
            await toggleArchiefProject(project.id, !project.archief);
            toast.success(project.archief ? "Hersteld" : "Gearchiveerd");
          })
        }
        aria-label={project.archief ? "Herstellen" : "Archiveren"}
      >
        {project.archief ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Project "${project.naam}" verwijderen?`)) return;
          start(async () => {
            const r = await deleteProjectAction(project.id);
            if (!r.ok) toast.error(r.error ?? "Verwijderen mislukt");
            else toast.success("Project verwijderd");
          });
        }}
        aria-label="Verwijderen"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProjectSheet({
  open,
  onOpenChange,
  project,
  klanten,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  project: Project | null;
  klanten: Klant[];
}) {
  const [pending, start] = useTransition();
  const [klantId, setKlantId] = useState<string>(project?.klant_id ?? "__none__");
  const [kleur, setKleur] = useState<string>(project?.kleur ?? "#E8732A");
  const [factureerbaar, setFactureerbaar] = useState<boolean>(project?.factureerbaar ?? true);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("klant_id", klantId);
    fd.set("kleur", kleur);
    fd.set("factureerbaar", factureerbaar ? "true" : "false");
    start(async () => {
      const r = await saveProjectAction(project?.id ?? null, fd);
      if (r.ok) {
        toast.success(project ? "Project bijgewerkt" : "Project aangemaakt");
        onOpenChange(false);
      } else toast.error(r.error ?? "Opslaan mislukt");
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{project ? "Project bewerken" : "Nieuw project"}</SheetTitle>
          <SheetDescription>Koppel aan een klant of laat persoonlijk</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="naam">Naam</Label>
            <Input id="naam" name="naam" defaultValue={project?.naam ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label>Klant</Label>
            <Select value={klantId} onValueChange={setKlantId}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een klant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Persoonlijk / overig</SelectItem>
                {klanten.filter((k) => !k.archief).map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.naam}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="omschrijving">Omschrijving</Label>
            <Textarea id="omschrijving" name="omschrijving" rows={2} defaultValue={project?.omschrijving ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uurtarief">Uurtarief (€) — leeg = klant of profiel</Label>
            <Input
              id="uurtarief"
              name="uurtarief"
              type="number"
              step="0.01"
              min="0"
              defaultValue={project?.uurtarief ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Kleur</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setKleur(c)}
                  aria-label={`Kleur ${c}`}
                  className={`h-7 w-7 rounded-full border-2 ${kleur === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Factureerbaar</Label>
              <p className="text-xs text-muted-foreground">Komt standaard op facturen</p>
            </div>
            <Switch checked={factureerbaar} onCheckedChange={setFactureerbaar} />
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
