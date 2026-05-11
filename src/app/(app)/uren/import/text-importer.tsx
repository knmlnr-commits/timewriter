"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ClipboardPaste, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Klant, Project } from "@/lib/types";
import { parseBulkUren, type ParsedRow } from "@/lib/parse-bulk-uren";
import { importTextAction } from "./text-actions";

type Row = ParsedRow & {
  project_id: string | null;
  skip: boolean;
  uren_str: string;
  omschrijving_edit: string;
};

const VOORBEELD = `Datum\tDag\tWerkzaamheden\tUren
1 mei\tvrij\tAI beleidsdocument MT\t4,5
1 mei\tvrij\tIDEA-013 eLearning specs\t2,0`;

export function TextImporter({ projecten, klanten }: { projecten: Project[]; klanten: Klant[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pending, start] = useTransition();

  const klantNaam = (id: string | null) =>
    id ? klanten.find((k) => k.id === id)?.naam ?? "" : "Persoonlijk";

  const projectOptions = projecten.map((p) => ({
    value: p.id,
    label: p.naam,
    hint: klantNaam(p.klant_id),
  }));

  function ontleed() {
    if (!text.trim()) {
      toast.warning("Plak eerst je tabel in het tekstvak.");
      return;
    }
    const r = parseBulkUren(text, jaar);
    if (r.rows.length === 0) {
      toast.error("Geen rijen herkend. Kijk of er minstens 4 regels per registratie of tabs in zitten.");
      return;
    }
    setRows(
      r.rows.map((row) => ({
        ...row,
        project_id: defaultProjectId,
        skip: Boolean(row.error),
        uren_str: row.uren !== null ? String(row.uren).replace(".", ",") : row.raw.uren,
        omschrijving_edit: row.omschrijving,
      }))
    );
    const meta =
      r.format === "vier-regels"
        ? `${r.rows.length} regels (4-regel-formaat)`
        : `${r.rows.length} regels (tab-formaat)`;
    toast.success(`${meta} ingelezen`);
  }

  function setAlleProjecten(pid: string | null) {
    setDefaultProjectId(pid);
    if (rows) {
      setRows(rows.map((r) => ({ ...r, project_id: pid })));
    }
  }

  function update(idx: number, patch: Partial<Row>) {
    setRows((rs) => (rs ? rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)) : rs));
  }

  const validCount = useMemo(
    () => (rows ?? []).filter((r) => !r.skip && !r.error && r.project_id).length,
    [rows]
  );
  const totalHours = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => !r.skip && !r.error && r.project_id && r.uren !== null)
        .reduce((s, r) => s + (r.uren ?? 0), 0),
    [rows]
  );

  function doImport() {
    if (!rows) return;
    const payload = rows
      .filter((r) => !r.skip && !r.error && r.project_id && r.datum !== null && r.uren !== null)
      .map((r) => ({
        datum: r.datum!,
        uren: r.uren!,
        omschrijving: r.omschrijving_edit.trim() || r.omschrijving,
        project_id: r.project_id!,
        factureerbaar: true,
      }));
    if (payload.length === 0) {
      toast.warning("Geen importeerbare regels. Kies een project of corrigeer de errors.");
      return;
    }
    start(async () => {
      const r = await importTextAction(payload);
      if (!r.ok) {
        toast.error(r.error ?? "Import mislukt.");
        return;
      }
      toast.success(
        `Geïmporteerd: ${r.created ?? 0} | duplicaten: ${r.duplicates ?? 0} | overgeslagen: ${r.skipped ?? 0}`
      );
      setText("");
      setRows(null);
      router.push("/uren");
    });
  }

  function reset() {
    setText("");
    setRows(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4" /> Plak je urenoverzicht
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={10}
            placeholder={`Plak hier je tabel, bijvoorbeeld:\n\n${VOORBEELD}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="font-mono text-xs"
          />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Welke formaten werken?</summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Tab-formaat</b>: 1 regel per registratie, kolommen gescheiden met tabs (Excel-paste). Volgorde: datum &middot; dag (optioneel) &middot; omschrijving &middot; uren.</li>
              <li><b>Vier-regel-formaat</b>: 4 opeenvolgende regels per registratie (Word/Notion tabel-paste).</li>
              <li><b>Datum</b>: "1 mei", "1 mei 2026", "01-05", "01-05-2026", "2026-05-01" werken allemaal. Jaar zonder vermelding = onderstaand jaar.</li>
              <li><b>Uren</b>: "4,5", "4.5" en "1:30" zijn allemaal goed.</li>
              <li>Een header-regel (Datum / Dag / Werkzaamheden / Uren) wordt automatisch overgeslagen.</li>
            </ul>
          </details>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jaar">Jaar (voor datums zonder jaartal)</Label>
              <Input
                id="jaar"
                type="number"
                min={2000}
                max={2100}
                value={jaar}
                onChange={(e) => setJaar(Number(e.target.value) || new Date().getFullYear())}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Project voor alle regels</Label>
              <Combobox
                options={projectOptions}
                value={defaultProjectId}
                onChange={setAlleProjecten}
                placeholder="Kies een project"
                clearable
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {rows ? (
              <Button variant="ghost" onClick={reset} className="gap-2">
                <Trash2 className="h-4 w-4" /> Wissen
              </Button>
            ) : null}
            <Button onClick={ontleed}>Lees in</Button>
          </div>
        </CardContent>
      </Card>

      {rows && rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {rows.length} rijen herkend &middot; {validCount} klaar voor import &middot;{" "}
              {totalHours.toFixed(2)} u
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">Skip</TableHead>
                    <TableHead className="w-32">Datum</TableHead>
                    <TableHead className="w-20 text-right">Uren</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="w-64">Project</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        row.error
                          ? "bg-red-50/40"
                          : row.skip
                          ? "opacity-50"
                          : !row.project_id
                          ? "bg-amber-50/40"
                          : ""
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={row.skip}
                          onCheckedChange={(c) => update(idx, { skip: Boolean(c) })}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {row.datum ? (
                          <div>
                            <div>{format(new Date(row.datum), "EEE d MMM yyyy", { locale: nl })}</div>
                            <div className="text-xs text-muted-foreground">{row.raw.datum}</div>
                          </div>
                        ) : (
                          <span className="text-red-700">{row.raw.datum}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.uren_str}
                          onChange={(e) => {
                            const v = e.target.value;
                            const num = Number(v.replace(",", "."));
                            update(idx, {
                              uren_str: v,
                              uren: Number.isFinite(num) && num > 0 && num <= 24 ? num : null,
                            });
                          }}
                          className="text-right h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.omschrijving_edit}
                          onChange={(e) => update(idx, { omschrijving_edit: e.target.value })}
                          className="h-8"
                        />
                        {row.error ? (
                          <div className="text-xs text-red-700 mt-1">{row.error}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Combobox
                          options={projectOptions}
                          value={row.project_id}
                          onChange={(v) => update(idx, { project_id: v })}
                          placeholder="Geen"
                          clearable
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Geel = geen project gekozen. Rood = parseerfout. Beide worden niet
                geïmporteerd. Duplicaten (zelfde datum + project + omschrijving + uren) worden
                automatisch overgeslagen.
              </p>
              <Button onClick={doImport} disabled={pending || validCount === 0}>
                {pending ? "Importeren..." : `Importeer ${validCount} regels`}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
