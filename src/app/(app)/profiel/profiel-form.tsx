"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/auth";
import { changePasswordAction, saveProfielAction } from "./actions";

const PALETTE = [
  { label: "Oranje", value: "#E8732A" },
  { label: "Blauw", value: "#2563EB" },
  { label: "Groen", value: "#16A34A" },
  { label: "Paars", value: "#7C3AED" },
  { label: "Teal", value: "#0D9488" },
  { label: "Grijs", value: "#52525B" },
] as const;

export function ProfielForm({ profile }: { profile: Profile }) {
  const [accent, setAccent] = useState(profile.accent_kleur);
  const [pending, startTransition] = useTransition();
  const [pwPending, startPwTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("accent_kleur", accent);
    startTransition(async () => {
      const r = await saveProfielAction(fd);
      if (r.ok) toast.success("Profiel bijgewerkt");
      else toast.error(r.error ?? "Opslaan mislukt");
    });
  }
  function submitPw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startPwTransition(async () => {
      const r = await changePasswordAction(fd);
      if (r.ok) {
        toast.success("Wachtwoord bijgewerkt");
        e.currentTarget.reset();
      } else toast.error(r.error ?? "Wijzigen mislukt");
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Algemeen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row>
              <Field id="naam" label="Naam">
                <Input id="naam" name="naam" defaultValue={profile.naam} required />
              </Field>
              <Field id="standaard_uurtarief" label="Standaard uurtarief (€)">
                <Input
                  id="standaard_uurtarief"
                  name="standaard_uurtarief"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={profile.standaard_uurtarief ?? ""}
                />
              </Field>
            </Row>
            <div className="space-y-2">
              <Label>Accentkleur</Label>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAccent(p.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
                      accent === p.value ? "border-foreground" : "border-input hover:bg-accent"
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.value }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Factuurgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row>
              <Field id="factuur_naam" label="Bedrijfs- of factuurnaam">
                <Input id="factuur_naam" name="factuur_naam" defaultValue={profile.factuur_naam} />
              </Field>
              <Field id="iban" label="IBAN">
                <Input id="iban" name="iban" defaultValue={profile.iban} />
              </Field>
            </Row>
            <Row>
              <Field id="factuur_adres" label="Adres">
                <Input id="factuur_adres" name="factuur_adres" defaultValue={profile.factuur_adres} />
              </Field>
              <Row inner>
                <Field id="factuur_postcode" label="Postcode">
                  <Input id="factuur_postcode" name="factuur_postcode" defaultValue={profile.factuur_postcode} />
                </Field>
                <Field id="factuur_plaats" label="Plaats">
                  <Input id="factuur_plaats" name="factuur_plaats" defaultValue={profile.factuur_plaats} />
                </Field>
              </Row>
            </Row>
            <Row>
              <Field id="kvk_nummer" label="KVK-nummer">
                <Input id="kvk_nummer" name="kvk_nummer" defaultValue={profile.kvk_nummer} />
              </Field>
              <Field id="btw_nummer" label="BTW-nummer">
                <Input id="btw_nummer" name="btw_nummer" defaultValue={profile.btw_nummer} />
              </Field>
            </Row>
            <Row>
              <Field id="factuurnummer_prefix" label="Factuurnummer-prefix">
                <Input id="factuurnummer_prefix" name="factuurnummer_prefix" defaultValue={profile.factuurnummer_prefix} placeholder="bv. 2026-" />
              </Field>
              <Field id="volgend_factuurnummer" label="Volgend nummer">
                <Input
                  id="volgend_factuurnummer"
                  name="volgend_factuurnummer"
                  type="number"
                  min="1"
                  defaultValue={profile.volgend_factuurnummer}
                />
              </Field>
            </Row>
            <Field id="factuur_voettekst" label="Voettekst">
              <Textarea
                id="factuur_voettekst"
                name="factuur_voettekst"
                rows={2}
                defaultValue={profile.factuur_voettekst}
                placeholder="bv. Bedankt voor de samenwerking. Betalingstermijn 30 dagen."
              />
            </Field>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </form>

      <form onSubmit={submitPw}>
        <Card>
          <CardHeader>
            <CardTitle>Wachtwoord wijzigen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="wachtwoord" label="Nieuw wachtwoord (min. 8 tekens)">
              <Input id="wachtwoord" name="wachtwoord" type="password" minLength={8} required />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={pwPending}>
                {pwPending ? "Bezig..." : "Wachtwoord opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Row({ children, inner }: { children: React.ReactNode; inner?: boolean }) {
  return <div className={cn("grid gap-4", inner ? "grid-cols-2" : "md:grid-cols-2")}>{children}</div>;
}
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
