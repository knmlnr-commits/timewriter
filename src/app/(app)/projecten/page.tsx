import { requireUser } from "@/lib/auth";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { ProjectenView } from "./projecten-view";

export default async function ProjectenPage() {
  const user = await requireUser();
  const [projecten, klanten] = await Promise.all([listProjecten(user.id), listKlanten(user.id)]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Projecten</h1>
        <p className="text-sm text-muted-foreground">
          Projecten horen bij een klant of zijn persoonlijk
        </p>
      </header>
      <ProjectenView projecten={projecten} klanten={klanten} />
    </div>
  );
}
