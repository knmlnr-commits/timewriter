"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 150 * 1024; // 150KB encoded; ~110KB original

type Props = {
  /** Huidig opgeslagen logo als data URL, of lege string. */
  value: string;
  /** Wordt aangeroepen met de nieuwe data URL of "" om te wissen. Mag async zijn. */
  onChange: (dataUrl: string) => void | Promise<void>;
};

/**
 * Logo-upload met preview. Sla data URL op in de profile;
 * voor de PDF wordt 'm rechtstreeks gebruikt door @react-pdf/renderer.
 */
export function LogoUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, start] = useTransition();
  const [preview, setPreview] = useState(value);

  async function handleFile(file: File) {
    if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml)$/)) {
      toast.error("Alleen PNG, JPG of SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        `Logo is ${(file.size / 1024).toFixed(0)}KB; max ${(MAX_BYTES / 1024).toFixed(0)}KB. Verklein 'm even.`
      );
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Kon bestand niet lezen."));
      reader.readAsDataURL(file);
    });
    setPreview(dataUrl);
    start(async () => {
      await onChange(dataUrl);
    });
  }

  function remove() {
    setPreview("");
    start(async () => {
      await onChange("");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div
          className="flex h-20 w-32 items-center justify-center rounded-md border bg-muted/30 overflow-hidden"
          aria-label="Logo voorbeeld"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Geen logo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={working}
          >
            <ImagePlus className="h-4 w-4" />
            {preview ? "Vervangen" : "Logo uploaden"}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive"
              onClick={remove}
              disabled={working}
            >
              <Trash2 className="h-4 w-4" />
              Verwijderen
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // Reset zodat dezelfde file opnieuw kan
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        PNG, JPG of SVG. Max 110KB. Wordt bovenaan elke factuur getoond.
      </p>
    </div>
  );
}
