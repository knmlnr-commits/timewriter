"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Send, Trash2, XCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteFactuurAction, toggleUrenBijlageAction, updateFactuurStatusAction } from "../actions";
import type { FactuurStatus } from "@/lib/types";

export function FactuurActions({ id, status }: { id: string; status: FactuurStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setStatus(next: FactuurStatus, msg: string) {
    start(async () => {
      await updateFactuurStatusAction(id, next);
      toast.success(msg);
      router.refresh();
    });
  }

  function del() {
    if (!confirm("Factuur verwijderen? De gekoppelde uren worden weer 'openstaand'.")) return;
    start(async () => {
      const r = await deleteFactuurAction(id);
      if (r && !r.ok) toast.error(r.error ?? "Verwijderen mislukt");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "concept" ? (
        <Button onClick={() => setStatus("verzonden", "Gemarkeerd als verzonden")} disabled={pending} variant="outline" className="gap-2">
          <Send className="h-4 w-4" /> Markeer verzonden
        </Button>
      ) : null}
      {status === "verzonden" || status === "concept" ? (
        <Button onClick={() => setStatus("betaald", "Gemarkeerd als betaald")} disabled={pending} variant="outline" className="gap-2">
          <Check className="h-4 w-4" /> Markeer betaald
        </Button>
      ) : null}
      {status === "verzonden" ? (
        <Button onClick={() => setStatus("concept", "Teruggezet naar concept")} disabled={pending} variant="ghost" className="gap-2">
          <Pencil className="h-4 w-4" /> Terug naar concept
        </Button>
      ) : null}
      {status !== "geannuleerd" && status !== "betaald" ? (
        <Button onClick={() => setStatus("geannuleerd", "Geannuleerd")} disabled={pending} variant="ghost" className="gap-2">
          <XCircle className="h-4 w-4" /> Annuleren
        </Button>
      ) : null}
      {status !== "betaald" ? (
        <Button onClick={del} disabled={pending} variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" /> Verwijderen
        </Button>
      ) : null}
    </div>
  );
}

export function UrenBijlageToggle({
  id,
  initialEnabled,
}: {
  id: string;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle(value: boolean) {
    start(async () => {
      const r = await toggleUrenBijlageAction(id, value);
      if (!r.ok) {
        toast.error(r.error ?? "Aanpassen mislukt");
        return;
      }
      toast.success(value ? "Bijlage met urendetail aan" : "Bijlage uitgeschakeld");
      router.refresh();
    });
  }

  return (
    <label className="flex items-start gap-3 rounded-md border bg-card p-3 cursor-pointer">
      <Checkbox
        checked={initialEnabled}
        onCheckedChange={(v) => toggle(Boolean(v))}
        className="mt-0.5"
        disabled={pending}
      />
      <div className="text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Bijlage met urendetail
        </span>
        <p className="text-xs text-muted-foreground">
          Extra pagina (PDF) en sheet (Excel) met alle onderliggende registraties:
          datum, project, omschrijving, uren.
        </p>
      </div>
    </label>
  );
}
