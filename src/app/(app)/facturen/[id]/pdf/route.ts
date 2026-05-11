import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser, getUserRecord } from "@/lib/auth";
import { getFactuur } from "@/lib/repo/facturen";
import { getKlant } from "@/lib/repo/klanten";
import { getTijd } from "@/lib/repo/tijden";
import { listProjecten } from "@/lib/repo/projecten";
import { InvoiceDocument } from "@/lib/pdf/invoice";
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

  let bijlage: { tijden: Tijdsregistratie[]; projecten: Awaited<ReturnType<typeof listProjecten>> } | undefined;
  if (factuur.include_uren_bijlage) {
    const allTijdIds = [...new Set(factuur.regels.flatMap((r) => r.tijd_ids ?? []))];
    const tijdRecords = await Promise.all(allTijdIds.map((tid) => getTijd(user.id, tid)));
    const tijden = tijdRecords.filter((t): t is Tijdsregistratie => Boolean(t));
    const projecten = await listProjecten(user.id);
    bijlage = { tijden, projecten };
  }

  const buffer = await renderToBuffer(
    InvoiceDocument({
      factuur,
      klant,
      profile: userRecord.profile,
      accentKleur: userRecord.profile.accent_kleur,
      bijlage,
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factuur-${factuur.factuurnummer}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
