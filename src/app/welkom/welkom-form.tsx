"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "./actions";

const PALETTE = [
  { label: "Oranje", value: "#E8732A" },
  { label: "Blauw", value: "#2563EB" },
  { label: "Groen", value: "#16A34A" },
  { label: "Paars", value: "#7C3AED" },
  { label: "Teal", value: "#0D9488" },
  { label: "Grijs", value: "#52525B" },
] as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Bezig..." : "Doorgaan"}
    </Button>
  );
}

export function WelkomForm({
  defaultNaam,
  defaultUurtarief,
  defaultAccent,
}: {
  defaultNaam: string;
  defaultUurtarief: number | null;
  defaultAccent: string;
}) {
  const [state, formAction] = useActionState(completeOnboardingAction, undefined);
  const [accent, setAccent] = useState(defaultAccent);
  return (
    <form action={formAction} className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
      <div className="space-y-1.5">
        <Label htmlFor="naam">Naam</Label>
        <Input id="naam" name="naam" defaultValue={defaultNaam} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="standaard_uurtarief">Standaard uurtarief (€)</Label>
        <Input
          id="standaard_uurtarief"
          name="standaard_uurtarief"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultUurtarief ?? ""}
          placeholder="Optioneel; kun je per klant of project overschrijven"
        />
      </div>
      <div className="space-y-2">
        <Label>Accentkleur</Label>
        <input type="hidden" name="accent_kleur" value={accent} />
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setAccent(p.value)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                accent === p.value
                  ? "border-foreground"
                  : "border-input hover:bg-accent"
              )}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.value }} />
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
