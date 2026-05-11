import { isAdmin, requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { SnelInvoerProvider } from "@/components/snel-invoer/snel-invoer-context";
import { SnelInvoerDialog } from "@/components/snel-invoer/snel-invoer-dialog";
import { listProjecten } from "@/lib/repo/projecten";
import { listKlanten } from "@/lib/repo/klanten";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.profile.voltooid) {
    redirect("/welkom");
  }
  const [projecten, klanten] = await Promise.all([
    listProjecten(user.id),
    listKlanten(user.id),
  ]);

  return (
    <SnelInvoerProvider
      projecten={projecten.filter((p) => !p.archief)}
      klanten={klanten.filter((k) => !k.archief)}
    >
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar naam={user.profile.naam} isAdmin={isAdmin(user)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar email={user.email} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
      <SnelInvoerDialog />
    </SnelInvoerProvider>
  );
}
