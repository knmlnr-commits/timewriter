import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDefaultWeek } from "@/lib/repo/default-week";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BevestigCard } from "./bevestig-card";

export const dynamic = "force-dynamic";

type Search = { pattern_id?: string; date?: string };

export default async function BevestigPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const patternId = sp.pattern_id ?? "";
  const date = sp.date ?? format(new Date(), "yyyy-MM-dd");

  const [patterns, projecten, klanten] = await Promise.all([
    getDefaultWeek(user.id),
    listProjecten(user.id),
    listKlanten(user.id),
  ]);
  const pattern = patterns.find((p) => p.id === patternId);

  if (!pattern) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/uren" aria-label="Terug">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Patroon niet gevonden</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            De reminder verwijst naar een patroon dat is verwijderd. Open{" "}
            <Link href="/uren/chat" className="underline">Chat</Link> om je uren in te vullen,
            of <Link href="/uren/patroon" className="underline">stel je patroon opnieuw in</Link>.
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = projecten.find((p) => p.id === pattern.project_id);
  const klant = project?.klant_id ? klanten.find((k) => k.id === project.klant_id) : null;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/uren" aria-label="Terug">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reminder</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(date), "EEEE d MMMM yyyy", { locale: nl })}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Was {project?.naam ?? "deze afspraak"}?</CardTitle>
        </CardHeader>
        <CardContent>
          <BevestigCard
            pattern={pattern}
            project={project ?? null}
            klant={klant ?? null}
            date={date}
          />
        </CardContent>
      </Card>
    </div>
  );
}
