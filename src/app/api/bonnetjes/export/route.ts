import { NextResponse } from "next/server";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { listBonnetjes } from "@/lib/repo/bonnetjes";
import { listKlanten } from "@/lib/repo/klanten";
import { listProjecten } from "@/lib/repo/projecten";
import { BONNETJE_CATEGORIE_LABEL } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(";") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  // Boekhoud-vriendelijk: NL-formaat met komma als decimaal, geen valuta-prefix
  return value.toFixed(2).replace(".", ",");
}

/**
 * CSV-export voor de boekhouder. Semicolon-gescheiden (NL Excel-default),
 * UTF-8 met BOM zodat Excel speciale tekens niet verprutst.
 *
 * Query params: ?van=YYYY-MM-DD&tot=YYYY-MM-DD (beide optioneel; default alles)
 */
export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const van = url.searchParams.get("van") ?? undefined;
  const tot = url.searchParams.get("tot") ?? undefined;

  const [bonnetjes, klanten, projecten] = await Promise.all([
    listBonnetjes(user.id, { from: van, to: tot }),
    listKlanten(user.id),
    listProjecten(user.id),
  ]);

  const klantById = new Map(klanten.map((k) => [k.id, k]));
  const projectById = new Map(projecten.map((p) => [p.id, p]));

  const headers = [
    "Datum",
    "Leverancier",
    "Categorie",
    "Bedrag",
    "BTW",
    "Valuta",
    "Omschrijving",
    "Klant",
    "Project",
    "Doorbelast",
    "Gefactureerd",
    "Bron",
    "Foto",
    "ID",
  ];

  const lines: string[] = [headers.join(";")];

  for (const b of bonnetjes) {
    const klant = b.klant_id ? klantById.get(b.klant_id) : null;
    const project = b.project_id ? projectById.get(b.project_id) : null;
    lines.push(
      [
        csvEscape(b.datum),
        csvEscape(b.leverancier),
        csvEscape(BONNETJE_CATEGORIE_LABEL[b.categorie] ?? b.categorie),
        csvEscape(fmtMoney(b.bedrag)),
        csvEscape(fmtMoney(b.btw_bedrag)),
        csvEscape(b.valuta || "EUR"),
        csvEscape(b.omschrijving),
        csvEscape(klant?.naam ?? ""),
        csvEscape(project?.naam ?? ""),
        csvEscape(b.doorbelast ? "ja" : "nee"),
        csvEscape(b.factuur_id ? "ja" : "nee"),
        csvEscape(b.bron),
        csvEscape(b.foto_data ? "ja" : "nee"),
        csvEscape(b.id),
      ].join(";")
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const range = van && tot ? `${van}_tot_${tot}` : "alles";
  const filename = `bonnetjes-${range}-${today}.csv`;

  // UTF-8 BOM zodat Excel het juiste encoding raadt en é/ü/€ correct toont
  const body = "﻿" + lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
