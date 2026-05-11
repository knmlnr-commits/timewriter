import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { requireUser, getUserRecord } from "@/lib/auth";
import { getFactuur } from "@/lib/repo/facturen";
import { getKlant } from "@/lib/repo/klanten";
import { getTijd } from "@/lib/repo/tijden";
import { listProjecten } from "@/lib/repo/projecten";
import type { Tijdsregistratie } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [factuur, userRecord] = await Promise.all([
    getFactuur(user.id, id),
    getUserRecord(user.id),
  ]);
  if (!factuur || !userRecord) return new NextResponse("Not found", { status: 404 });
  const klant = await getKlant(user.id, factuur.klant_id);
  if (!klant) return new NextResponse("Klant niet gevonden", { status: 404 });

  const wb = XLSX.utils.book_new();

  const headerRows = [
    ["Factuur", factuur.factuurnummer],
    ["Datum", format(new Date(factuur.factuurdatum), "dd-MM-yyyy")],
    ["Vervaldatum", format(new Date(factuur.vervaldatum), "dd-MM-yyyy")],
    ["Periode", `${factuur.periode_start} t/m ${factuur.periode_eind}`],
    ["Klant", klant.naam],
    [],
    ["Omschrijving", "Aantal uren", "Uurtarief", "Bedrag"],
    ...factuur.regels.map((r) => [r.omschrijving, r.aantal_uren, r.uurtarief, r.bedrag]),
    [],
    ["Subtotaal", "", "", factuur.totaal_excl_btw],
    [`BTW ${factuur.btw_percentage}%`, "", "", factuur.btw_bedrag],
    ["Totaal", "", "", factuur.totaal_incl_btw],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  ws["!cols"] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Factuur");

  if (factuur.include_uren_bijlage) {
    const allTijdIds = [...new Set(factuur.regels.flatMap((r) => r.tijd_ids ?? []))];
    const tijdRecords = await Promise.all(allTijdIds.map((tid) => getTijd(user.id, tid)));
    const tijden = tijdRecords.filter((t): t is Tijdsregistratie => Boolean(t));
    const projecten = await listProjecten(user.id);
    const projectById = new Map(projecten.map((p) => [p.id, p]));
    const sorted = [...tijden].sort((a, b) =>
      a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.created_at.localeCompare(b.created_at)
    );
    const totaal = sorted.reduce((s, t) => s + (Number(t.uren) || 0), 0);
    const detailRows: (string | number)[][] = [
      ["Datum", "Project", "Omschrijving", "Uren"],
      ...sorted.map((t) => [
        t.datum,
        projectById.get(t.project_id)?.naam ?? "",
        t.omschrijving ?? "",
        Number(t.uren) || 0,
      ]),
      [],
      ["", "", "Totaal", totaal],
    ];
    const wsBijlage = XLSX.utils.aoa_to_sheet(detailRows);
    wsBijlage["!cols"] = [{ wch: 12 }, { wch: 32 }, { wch: 60 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsBijlage, "Urendetail");
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="factuur-${factuur.factuurnummer}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
