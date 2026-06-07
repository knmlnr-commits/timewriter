"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Camera, ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import {
  BONNETJE_CATEGORIEEN,
  BONNETJE_CATEGORIE_LABEL,
  type BonnetjeCategorie,
  type Klant,
  type Project,
} from "@/lib/types";
import { createBonnetjeAction } from "../actions";

type Form = {
  datum: string;
  bedrag: string;
  btw_bedrag: string;
  valuta: string;
  leverancier: string;
  categorie: BonnetjeCategorie;
  omschrijving: string;
  klant_id: string | null;
  project_id: string | null;
  doorbelast: boolean;
};

const TODAY = () => format(new Date(), "yyyy-MM-dd");

export function CaptureFlow({
  klanten,
  projecten,
  aiAvailable,
}: {
  klanten: Klant[];
  projecten: Project[];
  aiAvailable: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiBron, setAiBron] = useState(false);
  const [confidence, setConfidence] = useState<"hoog" | "medium" | "laag" | null>(null);
  const [saving, startSave] = useTransition();
  const [form, setForm] = useState<Form>({
    datum: TODAY(),
    bedrag: "",
    btw_bedrag: "",
    valuta: "EUR",
    leverancier: "",
    categorie: "overig",
    omschrijving: "",
    klant_id: null,
    project_id: null,
    doorbelast: false,
  });

  const klantOptions = klanten.map((k) => ({ value: k.id, label: k.naam }));
  const projectOptions = projecten.map((p) => ({
    value: p.id,
    label: p.naam,
    hint: p.klant_id ? klanten.find((k) => k.id === p.klant_id)?.naam ?? "" : "Persoonlijk",
  }));

  async function handleFile(file: File) {
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxLongEdge: 1280, quality: 0.72 });
      setFoto(dataUrl);
      setAiBron(false);
      setConfidence(null);
      if (aiAvailable) await analyze(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Foto laden mislukt");
    }
  }

  async function analyze(dataUrl: string) {
    setAnalyzing(true);
    try {
      const resp = await fetch("/api/bonnetjes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await resp.json();
      if (!resp.ok || data.kind === "error") {
        toast.error(data.error ?? `Analyse mislukt (${resp.status})`);
        return;
      }
      const ex = data.extracted;
      setForm((f) => ({
        ...f,
        datum: ex.datum || f.datum || TODAY(),
        bedrag: ex.bedrag != null ? String(ex.bedrag) : f.bedrag,
        btw_bedrag: ex.btw_bedrag != null ? String(ex.btw_bedrag) : f.btw_bedrag,
        valuta: ex.valuta || f.valuta,
        leverancier: ex.leverancier || f.leverancier,
        categorie: ex.categorie || f.categorie,
        omschrijving: ex.omschrijving || f.omschrijving,
      }));
      setAiBron(true);
      setConfidence(ex.vertrouwen ?? "medium");
      toast.success(`Velden ingevuld (zekerheid: ${ex.vertrouwen ?? "medium"})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyse mislukt");
    } finally {
      setAnalyzing(false);
    }
  }

  function removeFoto() {
    setFoto("");
    setAiBron(false);
    setConfidence(null);
  }

  function submit() {
    const bedragNum = Number(form.bedrag.replace(",", "."));
    if (!Number.isFinite(bedragNum) || bedragNum <= 0) {
      toast.error("Vul een bedrag in.");
      return;
    }
    if (!form.leverancier.trim()) {
      toast.error("Vul een leverancier in.");
      return;
    }
    const btwNum = form.btw_bedrag.trim()
      ? Number(form.btw_bedrag.replace(",", "."))
      : null;

    startSave(async () => {
      const r = await createBonnetjeAction({
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
        foto_data: foto,
        bron: aiBron ? "foto_ai" : "handmatig",
      });
      if (!r.ok) {
        toast.error(r.error ?? "Opslaan mislukt");
        return;
      }
      toast.success("Bonnetje opgeslagen");
      router.push("/bonnetjes");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-[var(--brand)]" />
            Foto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {foto ? (
            <div className="space-y-2">
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto}
                  alt="Bon"
                  className="w-full max-h-96 rounded-md object-contain bg-muted/40 border"
                />
                {analyzing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-md">
                    <span className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI leest de bon...
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {confidence ? (
                  <Badge variant={confidence === "hoog" ? "success" : confidence === "laag" ? "warning" : "soft"}>
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI-zekerheid: {confidence}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Geen AI-analyse</span>
                )}
                <Button variant="ghost" size="sm" onClick={removeFoto} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Andere foto
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="gap-2 h-16"
              >
                <Camera className="h-5 w-5" />
                Foto maken
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => galleryRef.current?.click()}
                className="gap-2 h-16"
              >
                <ImagePlus className="h-5 w-5" />
                Uit gallery
              </Button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

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
                required
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
                placeholder="23,45"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leverancier">Leverancier</Label>
            <Input
              id="leverancier"
              value={form.leverancier}
              onChange={(e) => setForm({ ...form, leverancier: e.target.value })}
              placeholder="bv. Albert Heijn, Shell, NS"
              required
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
              <Label htmlFor="btw">BTW (optioneel)</Label>
              <Input
                id="btw"
                type="text"
                inputMode="decimal"
                value={form.btw_bedrag}
                onChange={(e) => setForm({ ...form, btw_bedrag: e.target.value })}
                placeholder="—"
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
              placeholder="Optioneel — bv. lunch met klant"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Doorbelasten aan klant (optioneel)</Label>
            <Combobox
              options={klantOptions}
              value={form.klant_id}
              onChange={(v) => setForm({ ...form, klant_id: v, doorbelast: Boolean(v) })}
              placeholder="Geen"
              clearable
            />
          </div>

          {form.klant_id ? (
            <>
              <div className="space-y-1.5">
                <Label>Project (optioneel)</Label>
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

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push("/bonnetjes")}>
          Annuleren
        </Button>
        <Button onClick={submit} disabled={saving || analyzing}>
          {saving ? "Opslaan..." : "Bonnetje opslaan"}
        </Button>
      </div>
    </div>
  );
}
