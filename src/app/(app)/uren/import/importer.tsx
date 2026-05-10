"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Klant, Project } from "@/lib/types";
import { parseIcs, type IcsEvent } from "@/lib/ics";
import { importIcsAction, suggestMapping } from "./actions";

type Row = IcsEvent & {
  project_id: string | null;
  skip: boolean;
  remember: boolean;
};

export function IcsImporter({ projecten, klanten }: { projecten: Project[]; klanten: Klant[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, start] = useTransition();
  const [fileName, setFileName] = useState<string>("");

  const klantNaam = (id: string | null) =>
    id ? klanten.find((k) => k.id === id)?.naam ?? "" : "Persoonlijk";
  const projectOptions = projecten.map((p) => ({
    value: p.id,
    label: p.naam,
    hint: klantNaam(p.klant_id),
  }));

  async function handleFile(file: File) {
    const text = await file.text();
    let events: IcsEvent[] = [];
    try {
      events = parseIcs(text);
    } catch (e) {
      toast.error("Kan .ics niet lezen.");
      return;
    }
    if (events.length === 0) {
      toast.warning("Geen tijdgebonden events gevonden.");
      return;
    }
    setFileName(file.name);
    const subjects = events.map((e) => e.subject);
    const suggestions = await suggestMapping(subjects);
    setRows(
      events.map((e) => ({
        ...e,
        project_id: suggestions[e.subject] ?? null,
        skip: false,
        remember: false,
      }))
    );
  }

  const totalPerProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.skip || !r.project_id) continue;
      m.set(r.project_id, (m.get(r.project_id) ?? 0) + r.durationHours);
    }
    return m;
  }, [rows]);

  function update(idx: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function applyToAllSameSubject(idx: number) {
    const subj = rows[idx]?.subject;
    const projectId = rows[idx]?.project_id;
    if (!subj || !projectId) return;
    setRows((rs) =>
      rs.map((r) => (r.subject === subj ? { ...r, project_id: projectId } : r))
    );
  }

  function doImport() {
    start(async () => {
      const r = await importIcsAction(
        rows.map((row) => ({
          uid: row.uid,
          subject: row.subject,
          start: row.start.toISOString(),
          end: row.end.toISOString(),
          durationHours: row.durationHours,
          project_id: row.project_id,
          skip: row.skip,
          remember: row.remember,
        }))
      );
      if (!r.ok) {
        toast.error(r.error ?? "Import mislukt");
        return;
      }
      toast.success(
        `Geïmporteerd: ${r.created ?? 0} | overgeslagen: ${r.skipped ?? 0} | duplicaten: ${r.duplicates ?? 0}`
      );
      setRows([]);
      setFileName("");
      router.push("/uren");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 hover:bg-accent">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <div className="text-sm font-medium">.ics-bestand uploaden</div>
              <div className="text-xs text-muted-foreground">{fileName || "Sleep een bestand hierheen of klik om te kiezen"}</div>
            </div>
            <input
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> {rows.length} events gevonden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalPerProject.size > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {[...totalPerProject.entries()].map(([pid, u]) => {
                  const p = projecten.find((x) => x.id === pid);
                  return (
                    <span key={pid} className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[var(--brand)]">
                      {p?.naam ?? "?"}: {u.toFixed(2)} u
                    </span>
                  );
                })}
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skip</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Uren</TableHead>
                    <TableHead>Onderwerp</TableHead>
                    <TableHead className="w-72">Project</TableHead>
                    <TableHead>Onthoud</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={`${row.uid}-${idx}`} className={row.skip ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox checked={row.skip} onCheckedChange={(c) => update(idx, { skip: Boolean(c) })} />
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {format(row.start, "EEE d MMM", { locale: nl })}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap text-muted-foreground">
                        {format(row.start, "HH:mm")} – {format(row.end, "HH:mm")}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.durationHours.toFixed(2)}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Combobox
                            options={projectOptions}
                            value={row.project_id}
                            onChange={(v) => update(idx, { project_id: v })}
                            placeholder="Selecteer project"
                            clearable
                          />
                          {row.project_id ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              title="Pas op alle events met zelfde onderwerp toe"
                              onClick={() => applyToAllSameSubject(idx)}
                            >
                              alle
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={row.remember}
                          disabled={!row.project_id}
                          onCheckedChange={(c) => update(idx, { remember: Boolean(c) })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setRows([]); setFileName(""); }}>Annuleren</Button>
              <Button onClick={doImport} disabled={pending}>
                {pending ? "Importeren..." : "Importeren"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
