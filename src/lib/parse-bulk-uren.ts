/**
 * Parser voor bulk-tekst-plak van uren-overzichten.
 *
 * Ondersteunde formaten:
 *   1. TSV (tab-separated). Elke regel = één registratie.
 *        kolommen: datum [\t dag] \t omschrijving \t uren
 *      Eerste regel mag een header zijn (wordt automatisch herkend).
 *
 *   2. Vier-regel-groepen (zoals copy-paste uit Word/Notion tabellen).
 *      Elke 4 opeenvolgende non-lege regels = 1 row, in volgorde:
 *        datum
 *        dag (string, mag leeg)
 *        omschrijving
 *        uren
 *      Eerste 4-tupel mag een header zijn ("Datum / Dag / Werkzaamheden / Uren").
 *
 * Datum-formaten:
 *   - "1 mei" / "01 mei" / "1 mei 2026"   (Nederlandse maandnaam of afkorting)
 *   - "1-5", "01-05-2026", "1/5", "1/5/26"
 *   - "2026-05-01" (ISO)
 *
 * Uren-formaten:
 *   - "4,5", "4.5", "1:30" (zie parseUren)
 */

import { parseUren } from "@/lib/parse-uren";

export type ParsedRow = {
  raw: { datum: string; dag: string; omschrijving: string; uren: string };
  datum: string | null; // YYYY-MM-DD na resolutie tegen het jaar; null als niet te parsen
  uren: number | null;
  omschrijving: string;
  error: string | null;
};

export type ParseResult = {
  rows: ParsedRow[];
  format: "tsv" | "vier-regels" | "leeg";
  headerDetected: boolean;
};

const NL_MAANDEN: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mrt: 3, maart: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  aug: 8, augustus: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function parseDate(input: string, defaultYear: number): string | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;

  // ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)) return `${y}-${pad2(m)}-${pad2(d)}`;
    return null;
  }

  // d-m-yyyy of d/m/yyyy of d.m.yyyy
  const num = s.match(/^(\d{1,2})[\-/.](\d{1,2})(?:[\-/.](\d{2,4}))?$/);
  if (num) {
    const d = Number(num[1]);
    const m = Number(num[2]);
    let y = num[3] ? Number(num[3]) : defaultYear;
    if (y < 100) y += y < 70 ? 2000 : 1900;
    if (m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)) return `${y}-${pad2(m)}-${pad2(d)}`;
    return null;
  }

  // "1 mei" of "1 mei 2026" of "1 mei '26"
  const woord = s.match(/^(\d{1,2})\s+([a-z]+\.?)(?:\s+'?(\d{2,4}))?$/);
  if (woord) {
    const d = Number(woord[1]);
    const maandKey = woord[2].replace(".", "");
    const m = NL_MAANDEN[maandKey];
    if (!m) return null;
    let y = woord[3] ? Number(woord[3]) : defaultYear;
    if (y < 100) y += y < 70 ? 2000 : 1900;
    if (d >= 1 && d <= daysInMonth(y, m)) return `${y}-${pad2(m)}-${pad2(d)}`;
    return null;
  }

  return null;
}

function isHeaderLine(s: string): boolean {
  const norm = s.trim().toLowerCase();
  return (
    norm === "datum" ||
    norm === "dag" ||
    norm === "werkzaamheden" ||
    norm === "omschrijving" ||
    norm === "uren" ||
    norm === "uren\t" // edge
  );
}

function isHeaderQuad(parts: string[]): boolean {
  if (parts.length < 4) return false;
  return parts.slice(0, 4).every((p) => isHeaderLine(p));
}

export function parseBulkUren(text: string, defaultYear: number): ParseResult {
  if (!text || !text.trim()) return { rows: [], format: "leeg", headerDetected: false };

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter((l) => l.length > 0);
  if (nonEmpty.length === 0) return { rows: [], format: "leeg", headerDetected: false };

  // TSV pad: er staan tabs in tenminste één van de eerste regels
  const hasTabs = nonEmpty.slice(0, 5).some((l) => l.includes("\t"));
  if (hasTabs) {
    let headerDetected = false;
    let start = 0;
    const firstCols = nonEmpty[0].split("\t").map((c) => c.trim());
    if (firstCols.length >= 3 && firstCols.every((c) => isHeaderLine(c))) {
      headerDetected = true;
      start = 1;
    }
    const rows: ParsedRow[] = [];
    for (let i = start; i < nonEmpty.length; i++) {
      const cols = nonEmpty[i].split("\t").map((c) => c.trim());
      let datum: string, dag: string, omschrijving: string, uren: string;
      if (cols.length >= 4) {
        [datum, dag, omschrijving, uren] = cols;
      } else if (cols.length === 3) {
        // datum, omschrijving, uren (geen dag-kolom)
        [datum, omschrijving, uren] = cols;
        dag = "";
      } else {
        rows.push({
          raw: { datum: cols[0] ?? "", dag: "", omschrijving: cols.slice(1).join(" "), uren: "" },
          datum: null,
          uren: null,
          omschrijving: cols.slice(1).join(" "),
          error: "Niet genoeg kolommen (minstens datum, omschrijving, uren).",
        });
        continue;
      }
      rows.push(buildRow(datum, dag, omschrijving, uren, defaultYear));
    }
    return { rows, format: "tsv", headerDetected };
  }

  // Vier-regel-groepen
  let idx = 0;
  let headerDetected = false;
  if (isHeaderQuad(nonEmpty)) {
    headerDetected = true;
    idx = 4;
  }
  const rows: ParsedRow[] = [];
  while (idx + 3 < nonEmpty.length) {
    const [datum, dag, omschrijving, uren] = nonEmpty.slice(idx, idx + 4);
    rows.push(buildRow(datum, dag, omschrijving, uren, defaultYear));
    idx += 4;
  }
  // Restanten (<4 regels over) negeren we stil; UI laat zien hoeveel rijen herkend zijn.
  return { rows, format: "vier-regels", headerDetected };
}

function buildRow(
  datumRaw: string,
  dagRaw: string,
  omschrijvingRaw: string,
  urenRaw: string,
  defaultYear: number
): ParsedRow {
  const omschrijving = omschrijvingRaw.trim();
  const datum = parseDate(datumRaw, defaultYear);
  let uren: number | null = null;
  let urenError: string | null = null;
  try {
    uren = parseUren(urenRaw);
  } catch (e) {
    urenError = e instanceof Error ? e.message : "Onbekende uren-fout";
  }

  let error: string | null = null;
  if (!datum) error = `Datum "${datumRaw}" niet herkend.`;
  else if (!omschrijving) error = "Omschrijving is leeg.";
  else if (uren === null) error = urenError ?? "Uren niet leesbaar.";
  else if (uren <= 0 || uren > 24) error = "Uren moet tussen 0 en 24 liggen.";

  return {
    raw: {
      datum: datumRaw.trim(),
      dag: dagRaw.trim(),
      omschrijving,
      uren: urenRaw.trim(),
    },
    datum,
    uren,
    omschrijving,
    error,
  };
}
