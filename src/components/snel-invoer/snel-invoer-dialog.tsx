"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { useSnelInvoer } from "./snel-invoer-context";
import { enqueue } from "./offline-queue";
import { createTijdAction } from "@/app/(app)/uren/actions";
import { format } from "date-fns";

const RECENT_KEY = "tw:recent-projects";

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
function pushRecent(id: string) {
  if (typeof window === "undefined") return;
  const list = readRecent().filter((v) => v !== id);
  list.unshift(id);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
}

export function SnelInvoerDialog() {
  const { isOpen, close, preset, projecten, klanten } = useSnelInvoer();
  const [datum, setDatum] = useState(format(new Date(), "yyyy-MM-dd"));
  const [projectId, setProjectId] = useState<string | null>(null);
  const [uren, setUren] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [factureerbaar, setFactureerbaar] = useState(true);
  const [recent, setRecent] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setDatum(preset?.datum ?? format(new Date(), "yyyy-MM-dd"));
      setProjectId(preset?.project_id ?? null);
      setUren("");
      setOmschrijving("");
      setFactureerbaar(true);
      setRecent(readRecent());
    }
  }, [isOpen, preset]);

  const klantNaam = (klantId: string | null) =>
    klantId ? klanten.find((k) => k.id === klantId)?.naam ?? "" : "Persoonlijk";

  const options = projecten.map((p) => ({
    value: p.id,
    label: p.naam,
    hint: klantNaam(p.klant_id),
  }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      toast.error("Kies een project");
      return;
    }
    const payload = {
      project_id: projectId,
      datum,
      uren,
      omschrijving,
      factureerbaar: factureerbaar ? ("true" as const) : ("false" as const),
    };
    const fd = new FormData();
    for (const [k, v] of Object.entries(payload)) fd.set(k, v);

    startTransition(async () => {
      // Offline? Direct in de queue, geen poging.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        enqueue(payload);
        pushRecent(projectId);
        toast.info("Offline opgeslagen, wordt verstuurd zodra je weer online bent");
        close();
        return;
      }

      try {
        const r = await createTijdAction(fd);
        if (!r.ok) {
          toast.error(r.error ?? "Opslaan mislukt");
          return;
        }
        pushRecent(projectId);
        toast.success("Uren toegevoegd");
        close();
      } catch {
        // Netwerk viel weg tijdens de call
        enqueue(payload);
        pushRecent(projectId);
        toast.info("Verbinding weggevallen, lokaal opgeslagen voor later");
        close();
      }
    });
  }

  function snel(setter: (d: string) => void, days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setter(format(d, "yyyy-MM-dd"));
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uren toevoegen</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="datum">Datum</Label>
              <Input id="datum" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required />
              <div className="flex gap-1 text-xs">
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => snel(setDatum, 0)}>
                  Vandaag
                </button>
                <span className="text-muted-foreground">·</span>
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => snel(setDatum, 1)}>
                  Gisteren
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uren">Uren</Label>
              <Input
                id="uren"
                placeholder="1,5 of 1:30"
                value={uren}
                onChange={(e) => setUren(e.target.value)}
                required
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            {projecten.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Nog geen projecten. Maak er eerst eentje aan onder Projecten.
              </p>
            ) : (
              <Combobox
                options={options}
                value={projectId}
                onChange={setProjectId}
                recentValues={recent}
                placeholder="Zoek of kies een project"
                clearable
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="omschrijving">Omschrijving</Label>
            <Textarea
              id="omschrijving"
              rows={2}
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              placeholder="Wat heb je gedaan?"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="factureerbaar" className="cursor-pointer">Factureerbaar</Label>
              <p className="text-xs text-muted-foreground">Komt op de eerstvolgende factuur</p>
            </div>
            <Switch id="factureerbaar" checked={factureerbaar} onCheckedChange={setFactureerbaar} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={close}>Annuleren</Button>
            <Button type="submit" disabled={pending}>{pending ? "Opslaan..." : "Opslaan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
