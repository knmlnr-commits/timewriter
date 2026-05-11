"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEK_DAYS, WEEK_DAY_LABELS, type WeeklyPattern, type WeekDay, type Klant, type Project } from "@/lib/types";
import { savePatroonAction } from "./actions";

type DraftPattern = WeeklyPattern & { _key: string };

export function PatroonEditor({
  initialPatterns,
  projecten,
  klanten,
}: {
  initialPatterns: WeeklyPattern[];
  projecten: Project[];
  klanten: Klant[];
}) {
  const [drafts, setDrafts] = useState<DraftPattern[]>(() =>
    initialPatterns.map((p) => ({ ...p, _key: p.id || crypto.randomUUID() }))
  );
  const [pending, start] = useTransition();

  const klantNaam = (id: string | null) =>
    id ? klanten.find((k) => k.id === id)?.naam ?? "" : "Persoonlijk";

  const projectOptions = useMemo(
    () =>
      projecten.map((p) => ({
        value: p.id,
        label: p.naam,
        hint: klantNaam(p.klant_id),
      })),
    [projecten, klanten]
  );

  function addRow(day: WeekDay) {
    setDrafts((rows) => [
      ...rows,
      {
        _key: crypto.randomUUID(),
        id: "",
        day,
        hours: 8,
        project_id: projecten[0]?.id ?? "",
        omschrijving: "",
      },
    ]);
  }

  function updateRow(key: string, patch: Partial<DraftPattern>) {
    setDrafts((rows) => rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setDrafts((rows) => rows.filter((r) => r._key !== key));
  }

  function save() {
    const invalid = drafts.find((d) => !d.project_id || !(d.hours > 0));
    if (invalid) {
      toast.error("Elke regel heeft een project en uren > 0 nodig.");
      return;
    }
    const payload = drafts.map(({ _key, ...rest }) => {
      void _key;
      return rest;
    });
    start(async () => {
      const r = await savePatroonAction(payload);
      if (r.ok) toast.success("Standaard werkweek opgeslagen");
      else toast.error(r.error ?? "Opslaan mislukt");
    });
  }

  const totaalPerDag = useMemo(() => {
    const m = new Map<WeekDay, number>();
    for (const d of drafts) m.set(d.day, (m.get(d.day) ?? 0) + Number(d.hours));
    return m;
  }, [drafts]);

  const totaalWeek = useMemo(
    () => drafts.reduce((s, d) => s + Number(d.hours), 0),
    [drafts]
  );

  if (projecten.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Maak eerst een project aan onder Projecten voordat je een standaard
          werkweek instelt.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {WEEK_DAYS.map((day) => {
        const rows = drafts.filter((d) => d.day === day);
        const total = totaalPerDag.get(day) ?? 0;
        return (
          <Card key={day}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-sm font-semibold">
                {WEEK_DAY_LABELS[day]}
                {total > 0 ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                    {total.toFixed(1)} u
                  </span>
                ) : null}
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addRow(day)}
                aria-label={`Regel toevoegen voor ${WEEK_DAY_LABELS[day]}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Geen vaste afspraak (vrij of incidenteel).</p>
              ) : (
                rows.map((row) => (
                  <div
                    key={row._key}
                    className="grid grid-cols-[1fr_5rem_auto] gap-2 items-start"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Project</Label>
                      <Combobox
                        options={projectOptions}
                        value={row.project_id}
                        onChange={(v) => updateRow(row._key, { project_id: v ?? "" })}
                        placeholder="Kies"
                      />
                      <Input
                        placeholder="Omschrijving (optioneel)"
                        value={row.omschrijving}
                        onChange={(e) => updateRow(row._key, { omschrijving: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Uren</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={row.hours}
                        onChange={(e) => updateRow(row._key, { hours: Number(e.target.value) })}
                        className="text-right"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(row._key)}
                      aria-label="Regel verwijderen"
                      className="mt-5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-center justify-between gap-2 rounded-xl border bg-card p-4">
        <span className="text-sm">
          Totaal per week:{" "}
          <span className="font-semibold tabular-nums">{totaalWeek.toFixed(1)} u</span>
        </span>
        <Button onClick={save} disabled={pending}>
          {pending ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}
