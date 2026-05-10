"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send, Trash2, XCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteFactuurAction, updateFactuurStatusAction } from "../actions";
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
