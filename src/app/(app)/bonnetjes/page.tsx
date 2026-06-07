import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Camera, Download, Plus, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listBonnetjes } from "@/lib/repo/bonnetjes";
import { listKlanten } from "@/lib/repo/klanten";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BonnetjesView } from "./bonnetjes-view";

export const dynamic = "force-dynamic";

type Search = { periode?: string; van?: string; tot?: string };

export default async function BonnetjesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const today = new Date();
  let from: string;
  let to: string;
  const periode = sp.periode ?? "deze-maand";
  if (periode === "deze-maand") {
    from = format(startOfMonth(today), "yyyy-MM-dd");
    to = format(endOfMonth(today), "yyyy-MM-dd");
  } else if (periode === "vorige-maand") {
    const prev = subMonths(today, 1);
    from = format(startOfMonth(prev), "yyyy-MM-dd");
    to = format(endOfMonth(prev), "yyyy-MM-dd");
  } else if (periode === "custom" && sp.van && sp.tot) {
    from = sp.van;
    to = sp.tot;
  } else {
    from = "1900-01-01";
    to = "2999-12-31";
  }

  const [bonnetjes, klanten] = await Promise.all([
    listBonnetjes(user.id, { from, to }),
    listKlanten(user.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[var(--brand)]" />
            Bonnetjes
          </h1>
          <p className="text-sm text-muted-foreground">
            Fotografeer een bon, AI vult de rest in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bonnetjes.length > 0 ? (
            <Button asChild variant="outline" className="gap-2" aria-label="Exporteer CSV">
              <a href={`/api/bonnetjes/export?van=${from}&tot=${to}`} download>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV-export</span>
              </a>
            </Button>
          ) : null}
          <Button asChild className="gap-2">
            <Link href="/bonnetjes/nieuw" aria-label="Nieuw bonnetje">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Nieuw bonnetje</span>
            </Link>
          </Button>
        </div>
      </header>

      {bonnetjes.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title="Nog geen bonnetjes deze periode"
          description="Maak een foto, plak een PDF, of voeg er handmatig eentje toe."
          action={
            <Button asChild className="gap-2">
              <Link href="/bonnetjes/nieuw">
                <Plus className="h-4 w-4" /> Eerste bonnetje toevoegen
              </Link>
            </Button>
          }
        />
      ) : (
        <BonnetjesView
          bonnetjes={bonnetjes}
          klanten={klanten}
          periode={periode}
          van={from}
          tot={to}
        />
      )}
    </div>
  );
}
