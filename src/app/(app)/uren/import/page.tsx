import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { Button } from "@/components/ui/button";
import { IcsImporter } from "./importer";

export default async function IcsImportPage() {
  const user = await requireUser();
  const [projecten, klanten] = await Promise.all([
    listProjecten(user.id),
    listKlanten(user.id),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link href="/uren"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importeren uit .ics</h1>
          <p className="text-sm text-muted-foreground">
            Upload een .ics-export uit Outlook of een andere kalender. Tijdgebonden events komen er door, hele-dag events worden overgeslagen.
          </p>
        </div>
      </div>
      <IcsImporter
        projecten={projecten.filter((p) => !p.archief)}
        klanten={klanten}
      />
    </div>
  );
}
