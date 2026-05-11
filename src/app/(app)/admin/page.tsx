import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { adminListUsers, isAdmin, requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminView } from "./admin-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAdmin();
  const users = await adminListUsers();

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    naam: u.profile.naam,
    is_admin: Boolean(u.profile.is_admin),
    voltooid: Boolean(u.profile.voltooid),
    created_at: u.created_at,
    self: u.id === me.id,
    envAdmin: !u.profile.is_admin && isAdmin({ email: u.email, profile: { is_admin: false } }),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Beheer</h1>
        <p className="text-sm text-muted-foreground">
          Toegangsbeleid voor deze omgeving. Alleen zichtbaar voor beheerders.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Beheerstatus</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            Ingelogd als <span className="font-medium text-foreground">{me.email}</span>{" "}
            <Badge variant="soft">beheerder</Badge>
          </p>
          <p>
            Nieuwe accounts kunnen alleen via dit scherm worden aangemaakt. De
            publieke <code>/signup</code>-route is na bootstrap niet meer
            bereikbaar.
          </p>
          <p>
            Noodingang via <code>ADMIN_EMAILS</code> env: e-mailadressen daar
            opgenomen worden altijd als beheerder behandeld, ongeacht hun
            opgeslagen vlag. Handig om jezelf terug te kunnen geven na een
            ongelukkige demotie.
          </p>
          <p>
            Datum vandaag: {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
          </p>
        </CardContent>
      </Card>

      <AdminView users={rows} currentId={me.id} />
    </div>
  );
}
