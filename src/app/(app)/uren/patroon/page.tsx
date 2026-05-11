import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { getDefaultWeek } from "@/lib/repo/default-week";
import { Button } from "@/components/ui/button";
import { PatroonEditor } from "./patroon-editor";

export const dynamic = "force-dynamic";

export default async function PatroonPage() {
  const user = await requireUser();
  const [patterns, projecten, klanten] = await Promise.all([
    getDefaultWeek(user.id),
    listProjecten(user.id),
    listKlanten(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/uren/chat" aria-label="Terug naar chat">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Standaard werkweek</h1>
          <p className="text-sm text-muted-foreground">
            De basis waarop de chat-assistent jouw uren voorstelt. Voeg per dag toe
            wat je normaal doet; afwijkingen vertel je gewoon in de chat.
          </p>
        </div>
      </div>

      <PatroonEditor
        initialPatterns={patterns}
        projecten={projecten.filter((p) => !p.archief)}
        klanten={klanten}
      />
    </div>
  );
}
