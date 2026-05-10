import { requireUser } from "@/lib/auth";
import { ProfielForm } from "./profiel-form";

export default async function ProfielPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profiel</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>
      <ProfielForm profile={user.profile} />
    </div>
  );
}
