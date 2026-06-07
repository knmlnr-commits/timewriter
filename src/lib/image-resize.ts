/**
 * Resize een afbeelding aan de client-kant via canvas en geef een base64
 * JPEG terug. Voorkomt dat we 3MB+ iPhone foto's naar de server uploaden.
 */
export async function resizeImageToDataUrl(
  file: File | Blob,
  opts: { maxLongEdge?: number; quality?: number } = {}
): Promise<string> {
  const maxEdge = opts.maxLongEdge ?? 1280;
  const quality = opts.quality ?? 0.7;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Kon bestand niet lezen."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Ongeldig beeldformaat."));
    i.src = dataUrl;
  });

  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  if (longEdge <= maxEdge) {
    // Al klein genoeg — alsnog door canvas voor consistente JPEG-compressie.
  }
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar.");
  // Witte achtergrond zodat transparante PNG's geen zwarte vlek krijgen
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}
