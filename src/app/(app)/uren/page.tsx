import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { requireUser } from "@/lib/auth";
import { listKlanten } from "@/lib/repo/klanten";
import { listProjecten } from "@/lib/repo/projecten";
import { listTijden } from "@/lib/repo/tijden";
import { UrenView } from "./uren-view";

type Search = { periode?: string; van?: string; tot?: string };

export default async function UrenPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = new Date();
  let from: string;
  let to: string;
  const periode = sp.periode ?? "deze-maand";
  if (periode === "deze-week") {
    from = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    to = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  } else if (periode === "alles") {
    from = "1900-01-01";
    to = "2999-12-31";
  } else if (periode === "custom" && sp.van && sp.tot) {
    from = sp.van;
    to = sp.tot;
  } else {
    from = format(startOfMonth(today), "yyyy-MM-dd");
    to = format(endOfMonth(today), "yyyy-MM-dd");
  }

  const [tijden, projecten, klanten] = await Promise.all([
    listTijden(user.id, { from, to }),
    listProjecten(user.id),
    listKlanten(user.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Uren</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(from), "d MMM yyyy")} — {format(new Date(to), "d MMM yyyy")}
          </p>
        </div>
      </header>
      <UrenView
        tijden={tijden}
        projecten={projecten}
        klanten={klanten}
        periode={periode}
        van={from}
        tot={to}
      />
    </div>
  );
}
