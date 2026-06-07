import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getBonnetje } from "@/lib/repo/bonnetjes";
import { listKlanten } from "@/lib/repo/klanten";
import { listProjecten } from "@/lib/repo/projecten";
import { Button } from "@/components/ui/button";
import { EditBonnetje } from "./edit-bonnetje";

export const dynamic = "force-dynamic";

export default async function BonnetjeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const bon = await getBonnetje(user.id, id);
  if (!bon) notFound();
  const [klanten, projecten] = await Promise.all([
    listKlanten(user.id),
    listProjecten(user.id),
  ]);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/bonnetjes" aria-label="Terug">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bonnetje</h1>
          <p className="text-sm text-muted-foreground">{bon.datum}</p>
        </div>
      </div>

      <EditBonnetje bonnetje={bon} klanten={klanten} projecten={projecten} />
    </div>
  );
}
