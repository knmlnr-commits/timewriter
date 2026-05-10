import { requireUser } from "@/lib/auth";
import { listKlanten } from "@/lib/repo/klanten";
import { KlantenView } from "./klanten-view";

export default async function KlantenPage() {
  const user = await requireUser();
  const klanten = await listKlanten(user.id);
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Klanten</h1>
          <p className="text-sm text-muted-foreground">Klantbeheer voor facturatie</p>
        </div>
      </header>
      <KlantenView klanten={klanten} />
    </div>
  );
}
