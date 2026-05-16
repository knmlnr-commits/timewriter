"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Klant, Project, WeeklyPattern } from "@/lib/types";
import { confirmReminderAction } from "./actions";

export function BevestigCard({
  pattern,
  project,
  klant,
  date,
}: {
  pattern: WeeklyPattern;
  project: Project | null;
  klant: Klant | null;
  date: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState<number>(pattern.hours);

  function confirm(useHours: number) {
    start(async () => {
      const r = await confirmReminderAction({
        pattern_id: pattern.id,
        date,
        hours: useHours,
      });
      if (r.ok) {
        toast.success(`${useHours} u geboekt`);
        router.push("/uren");
      } else {
        toast.error(r.error ?? "Boeken mislukt");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-md border-l-4 bg-muted/40 p-3 text-sm"
        style={{ borderLeftColor: project?.kleur ?? "var(--border)" }}
      >
        <div className="font-medium">{project?.naam ?? "Onbekend project"}</div>
        <div className="text-xs text-muted-foreground">
          {klant?.naam ?? "Persoonlijk"}
          {pattern.omschrijving ? ` · ${pattern.omschrijving}` : ""}
        </div>
        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
          Standaard: {pattern.hours} uur
        </div>
      </div>

      {!editing ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            onClick={() => confirm(pattern.hours)}
            disabled={pending}
            className="gap-2 flex-1"
          >
            <Check className="h-4 w-4" />
            Ja, boek {pattern.hours} u
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditing(true)}
            disabled={pending}
            className="gap-2 flex-1"
          >
            <Pencil className="h-4 w-4" />
            Anders aantal
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/uren")}
            disabled={pending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Niet gebeurd
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="uren">Aantal uur</Label>
            <Input
              id="uren"
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => confirm(hours)} disabled={pending || hours <= 0}>
              Boek {hours} u
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              Annuleren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
