import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { requireUser } from "@/lib/auth";
import { listKlanten } from "@/lib/repo/klanten";
import { listProjecten } from "@/lib/repo/projecten";
import { listTijden } from "@/lib/repo/tijden";
import { Button } from "@/components/ui/button";
import { NieuweFactuurFlow } from "./flow";

type Search = { klant?: string; van?: string; tot?: string };

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const vorigeMaand = subMonths(new Date(), 1);
  const van = sp.van ?? format(startOfMonth(vorigeMaand), "yyyy-MM-dd");
  const tot = sp.tot ?? format(endOfMonth(vorigeMaand), "yyyy-MM-dd");
  const klantId = sp.klant ?? null;

  const [klanten, projecten, tijden] = await Promise.all([
    listKlanten(user.id),
    listProjecten(user.id),
    listTijden(user.id, { from: van, to: tot }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link href="/facturen"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nieuwe factuur</h1>
          <p className="text-sm text-muted-foreground">Kies klant en periode, bewerk regels, en genereer.</p>
        </div>
      </div>
      <NieuweFactuurFlow
        klanten={klanten.filter((k) => !k.archief)}
        projecten={projecten}
        tijden={tijden}
        initialKlant={klantId}
        initialVan={van}
        initialTot={tot}
        profielTarief={user.profile.standaard_uurtarief}
      />
    </div>
  );
}
