"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { KeyRound, Plus, Shield, ShieldOff, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createUserAction,
  deleteUserAction,
  resetPasswordAction,
  toggleAdminAction,
} from "./actions";

type Row = {
  id: string;
  email: string;
  naam: string;
  is_admin: boolean;
  voltooid: boolean;
  created_at: string;
  self: boolean;
  envAdmin: boolean;
};

export function AdminView({ users, currentId }: { users: Row[]; currentId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<Row | null>(null);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gebruikers ({users.length})</h2>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nieuw account
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gemaakt</TableHead>
                <TableHead className="w-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.email}
                    {u.self ? <Badge variant="muted" className="ml-2">jij</Badge> : null}
                  </TableCell>
                  <TableCell>{u.naam || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {u.is_admin ? (
                      <Badge variant="soft">beheerder</Badge>
                    ) : u.envAdmin ? (
                      <Badge variant="outline">env-beheerder</Badge>
                    ) : (
                      <Badge variant="muted">gebruiker</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.voltooid ? (
                      <Badge variant="success">voltooid</Badge>
                    ) : (
                      <Badge variant="warning">onboarding</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {format(new Date(u.created_at), "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell>
                    <RowActions row={u} currentId={currentId} onReset={() => setResetFor(u)} onChanged={() => router.refresh()} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateUserSheet
        key={creating ? "open" : "closed"}
        open={creating}
        onOpenChange={(o) => !o && setCreating(false)}
        onCreated={() => {
          setCreating(false);
          router.refresh();
        }}
      />
      <ResetPasswordSheet
        key={resetFor?.id ?? "closed-reset"}
        user={resetFor}
        onOpenChange={(o) => !o && setResetFor(null)}
        onDone={() => {
          setResetFor(null);
          router.refresh();
        }}
      />
    </>
  );
}

function RowActions({
  row,
  currentId,
  onReset,
  onChanged,
}: {
  row: Row;
  currentId: string;
  onReset: () => void;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  function toggle() {
    if (row.self && row.is_admin) {
      if (!confirm("Jezelf demoten? Doe dit alleen als ADMIN_EMAILS je terug kan zetten of als er een andere beheerder is.")) {
        return;
      }
    }
    start(async () => {
      const r = await toggleAdminAction(row.id, !row.is_admin);
      if (r.ok) {
        toast.success(row.is_admin ? "Beheerderrol ingetrokken" : "Beheerderrol toegekend");
        onChanged();
      } else toast.error(r.error ?? "Mislukt");
    });
  }
  function del() {
    if (row.self) {
      toast.error("Je kunt je eigen account niet verwijderen.");
      return;
    }
    if (!confirm(`Account "${row.email}" verwijderen? Sessies worden direct ingetrokken.`)) return;
    start(async () => {
      const r = await deleteUserAction(row.id);
      if (r.ok) {
        toast.success("Account verwijderd");
        onChanged();
      } else toast.error(r.error ?? "Mislukt");
    });
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        title={row.is_admin ? "Beheerderrol intrekken" : "Beheerder maken"}
        onClick={toggle}
        disabled={pending}
        aria-label="Toggle beheerder"
      >
        {row.is_admin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Wachtwoord resetten"
        onClick={onReset}
        disabled={pending}
        aria-label="Wachtwoord resetten"
      >
        <KeyRound className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Verwijderen"
        onClick={del}
        disabled={pending || row.self}
        aria-label="Verwijderen"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CreateUserSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreated: () => void;
}) {
  const [pending, start] = useTransition();
  const [makeAdmin, setMakeAdmin] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("is_admin", makeAdmin ? "true" : "false");
    start(async () => {
      const r = await createUserAction(fd);
      if (!r.ok) {
        toast.error(r.error ?? "Aanmaken mislukt");
        return;
      }
      toast.success(`Account ${r.created?.email ?? ""} aangemaakt`);
      onCreated();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nieuw account aanmaken</SheetTitle>
          <SheetDescription>
            De nieuwe gebruiker logt zelf in met de hier opgegeven credentials.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="naam">Naam</Label>
            <Input id="naam" name="naam" required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Tijdelijk wachtwoord (min. 8 tekens)</Label>
            <Input
              id="password"
              name="password"
              type="text"
              minLength={8}
              required
              autoComplete="off"
              placeholder="Geef dit veilig door"
            />
            <p className="text-xs text-muted-foreground">
              De gebruiker kan dit zelf wijzigen in het profielscherm.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="cursor-pointer">Beheerderrol toekennen</Label>
                <p className="text-xs text-muted-foreground">Mag andere accounts beheren</p>
              </div>
            </div>
            <Checkbox checked={makeAdmin} onCheckedChange={(c) => setMakeAdmin(Boolean(c))} />
          </div>
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={pending}>{pending ? "Aanmaken..." : "Account aanmaken"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ResetPasswordSheet({
  user,
  onOpenChange,
  onDone,
}: {
  user: Row | null;
  onOpenChange: (b: boolean) => void;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    start(async () => {
      const r = await resetPasswordAction(user.id, password);
      if (!r.ok) {
        toast.error(r.error ?? "Mislukt");
        return;
      }
      toast.success("Wachtwoord gereset; sessies ingetrokken");
      onDone();
    });
  }

  return (
    <Sheet open={Boolean(user)} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Wachtwoord resetten</SheetTitle>
          <SheetDescription>
            Voor {user?.email}. Alle actieve sessies worden direct ingetrokken.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">Nieuw wachtwoord (min. 8 tekens)</Label>
            <Input id="reset-password" name="password" type="text" minLength={8} required autoComplete="off" />
          </div>
          <SheetFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={pending}>{pending ? "Bezig..." : "Wachtwoord opslaan"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
