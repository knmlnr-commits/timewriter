import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listKlanten } from "@/lib/repo/klanten";
import { listProjecten } from "@/lib/repo/projecten";
import { Button } from "@/components/ui/button";
import { CaptureFlow } from "./capture-flow";

export const dynamic = "force-dynamic";

export default async function NieuwBonnetjePage() {
  const user = await requireUser();
  const [klanten, projecten] = await Promise.all([
    listKlanten(user.id),
    listProjecten(user.id),
  ]);
  const aiAvailable = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/bonnetjes" aria-label="Terug">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nieuw bonnetje</h1>
          <p className="text-sm text-muted-foreground">
            {aiAvailable
              ? "Foto maken, AI vult in, jij bevestigt."
              : "Handmatig — AI staat uit op deze omgeving."}
          </p>
        </div>
      </div>

      <CaptureFlow
        klanten={klanten.filter((k) => !k.archief)}
        projecten={projecten.filter((p) => !p.archief)}
        aiAvailable={aiAvailable}
      />
    </div>
  );
}
