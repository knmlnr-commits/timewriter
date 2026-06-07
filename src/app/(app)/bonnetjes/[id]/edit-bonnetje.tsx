"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BONNETJE_CATEGORIEEN,
  BONNETJE_CATEGORIE_LABEL,
  type Bonnetje,
  type BonnetjeCategorie,
  type Klant,
  type Project,
} from "@/lib/types";
import { deleteBonnetjeAction, updateBonnetjeAction } from "../actions";

export function EditBonnetje({
  bonnetje,
  klanten,
  projecten,
}: {
  bonnetje: Bonnetje;
  klanten: Klant[];
  projecten: Project[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    datum: bonnetje.datum,
    bedrag: String(bonnetje.bedrag),
    btw_bedrag: bonnetje.btw_bedrag != null ? String(bonnetje.btw_bedrag) : "",
    valuta: bonnetje.valuta || "EUR",
    leverancier: bonnetje.leverancier,
    categorie: bonnetje.categorie,
    omschrijving: bonnetje.omschrijving,
    klant_id: bonnetje.klant_id,
    project_id: bonnetje.project_id,
    doorbelast: bonnetje.doorbelast,
  });

  const klantOptions = klanten.map((k) => ({ value: k.id, label: k.naam }));
  const projectOptions = projecten.map((p) => ({
    value: p.id,
    label: p.naam,
    hint: p.klant_id ? klanten.find((k) => k.id === p.klant_id)?.naam ?? "" : "Persoonlijk",
  }));

  function save() {
    const bedragNum = Number(form.bedrag.replace(",", "."));
    if (!Number.isFinite(bedragNum) || bedragNum <= 0) {
      toast.error("Vul een bedrag in.");
      return;
    }
    const btwNum = form.btw_bedrag.trim() ? Number(form.btw_bedrag.replace(",", ".")) : null;
    start(async () => {
      const r = await updateBonnetjeAction({
        id: bonnetje.id,
        datum: form.datum,
        bedrag: bedragNum,
        btw_bedrag: btwNum,
        valuta: form.valuta,
        leverancier: form.leverancier.trim(),
        categorie: form.categorie,
        omschrijving: form.omschrijving.trim(),
        klant_id: form.klant_id,
        project_id: form.project_id,
        doorbelast: form.doorbelast && Boolean(form.klant_id),
      });
      if (r.ok) {
        toast.success("Bijgewerkt");
        router.refresh();
      } else toast.error(r.error ?? "Mislukt");
    });
  }

  function del() {
    if (!confirm("Bonnetje verwijderen?")) return;
    start(async () => {
      const r = await deleteBonnetjeAction(bonnetje.id);
      if (!r.ok) {
        toast.error(r.error ?? "Mislukt");
        return;
      }
      toast.success("Verwijderd");
      router.push("/bonnetjes");
    });
  }

  return (
    <div className="space-y-4">
      {bonnetje.foto_data ? (
        <Card>
          <CardContent className="p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bonnetje.foto_data}
              alt="Bon"
              className="w-full max-h-96 rounded-md object-contain bg-muted/40"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gegevens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="datum">Datum</Label>
              <Input
                id="datum"
                type="date"
                value={form.datum}
                onChange={(e) => setForm({ ...form, datum: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrag">Bedrag (incl. btw)</Label>
              <Input
                id="bedrag"
                type="text"
                inputMode="decimal"
                value={form.bedrag}
                onChange={(e) => setForm({ ...form, bedrag: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leverancier">Leverancier</Label>
            <Input
              id="leverancier"
              value={form.leverancier}
              onChange={(e) => setForm({ ...form, leverancier: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categorie</Label>
            <Select
              value={form.categorie}
              onValueChange={(v) => setForm({ ...form, categorie: v as BonnetjeCategorie })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BONNETJE_CATEGORIEEN.map((c) => (
                  <SelectItem key={c} value={c}>
                    {BONNETJE_CATEGORIE_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="btw">BTW</Label>
              <Input
                id="btw"
                type="text"
                inputMode="decimal"
                value={form.btw_bedrag}
                onChange={(e) => setForm({ ...form, btw_bedrag: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valuta">Valuta</Label>
              <Input
                id="valuta"
                value={form.valuta}
                onChange={(e) => setForm({ ...form, valuta: e.target.value.toUpperCase() })}
                maxLength={4}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="omschr">Omschrijving</Label>
            <Textarea
              id="omschr"
              rows={2}
              value={form.omschrijving}
              onChange={(e) => setForm({ ...form, omschrijving: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Doorbelasten aan klant</Label>
            <Combobox
              options={klantOptions}
              value={form.klant_id}
              onChange={(v) => setForm({ ...form, klant_id: v })}
              placeholder="Geen"
              clearable
            />
          </div>
          {form.klant_id ? (
            <>
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Combobox
                  options={projectOptions}
                  value={form.project_id}
                  onChange={(v) => setForm({ ...form, project_id: v })}
                  placeholder="Geen"
                  clearable
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.doorbelast}
                  onCheckedChange={(v) => setForm({ ...form, doorbelast: Boolean(v) })}
                />
                <span className="text-sm">Op volgende factuur van deze klant zetten</span>
              </label>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="destructive" onClick={del} disabled={pending} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Verwijderen
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}
