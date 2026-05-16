import { requireUser } from "@/lib/auth";
import { ProfielForm } from "./profiel-form";
import { PushCard } from "./push-card";

export default async function ProfielPage() {
  const user = await requireUser();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profiel</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>
      <PushCard vapidPublicKey={vapidPublicKey} />
      <ProfielForm profile={user.profile} />
    </div>
  );
}
