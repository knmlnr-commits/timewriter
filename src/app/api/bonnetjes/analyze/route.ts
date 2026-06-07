import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { EXTRACT_BONNETJE_TOOL } from "@/lib/ai/bonnetje-tools";
import { BONNETJE_CATEGORIEEN, type BonnetjeCategorie } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "claude-opus-4-7";

const schema = z.object({
  /** Base64 data URL van de foto (data:image/jpeg;base64,...). */
  image: z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/),
});

type Extracted = {
  datum: string | null;
  bedrag: number | null;
  btw_bedrag: number | null;
  valuta: string;
  leverancier: string;
  categorie: BonnetjeCategorie;
  omschrijving: string;
  vertrouwen: "hoog" | "medium" | "laag";
};

type Response =
  | { kind: "ok"; extracted: Extracted; note: string }
  | { kind: "error"; error: string };

const TODAY_DATE = () => new Date().toISOString().slice(0, 10);

function parseDataUrl(input: string): { mediaType: "image/png" | "image/jpeg" | "image/webp"; data: string } {
  const match = input.match(/^data:(image\/(png|jpe?g|webp));base64,(.+)$/);
  if (!match) throw new Error("Onbruikbare data URL.");
  const mt = match[1] === "image/jpg" ? "image/jpeg" : (match[1] as "image/png" | "image/jpeg" | "image/webp");
  return { mediaType: mt, data: match[3] };
}

export async function POST(req: Request): Promise<NextResponse<Response>> {
  const user = await requireUser();
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { kind: "error", error: "AI-extractie is niet geconfigureerd. Zet ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }
  void user;

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { kind: "error", error: e instanceof Error ? e.message : "Ongeldige invoer." },
      { status: 400 }
    );
  }

  let parsed: ReturnType<typeof parseDataUrl>;
  try {
    parsed = parseDataUrl(body.image);
  } catch (e) {
    return NextResponse.json(
      { kind: "error", error: e instanceof Error ? e.message : "Ongeldige image." },
      { status: 400 }
    );
  }

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const today = TODAY_DATE();
  const system =
    `Je bent een gespecialiseerde extractor voor Nederlandse bonnetjes en facturen. ` +
    `Vandaag is ${today}. Roep ALTIJD de extract_receipt-tool aan met het beste resultaat. ` +
    `Bedragen NL: komma is decimaal, punt is duizendscheiding. Converteer naar standaard decimaal (punt). ` +
    `Datums: dd-mm-jjjj of dd-mm-jj naar YYYY-MM-DD. Twijfel je over jaar: kies de meest plausibele recente datum (<= vandaag).`;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      tools: [EXTRACT_BONNETJE_TOOL],
      tool_choice: { type: "tool", name: "extract_receipt" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: parsed.mediaType, data: parsed.data },
            },
            {
              type: "text",
              text: "Lees de gegevens van deze bon en geef ze terug via de extract_receipt-tool.",
            },
          ],
        },
      ],
    });

    let toolInput: Partial<Extracted> | null = null;
    let textNote = "";
    for (const block of response.content) {
      if (block.type === "text") textNote += block.text;
      if (block.type === "tool_use" && block.name === "extract_receipt") {
        toolInput = block.input as Partial<Extracted>;
      }
    }
    if (!toolInput) {
      return NextResponse.json(
        { kind: "error", error: "Geen extractie ontvangen van het model." },
        { status: 502 }
      );
    }

    const categorieOk =
      typeof toolInput.categorie === "string" &&
      (BONNETJE_CATEGORIEEN as readonly string[]).includes(toolInput.categorie);

    const extracted: Extracted = {
      datum:
        typeof toolInput.datum === "string" && /^\d{4}-\d{2}-\d{2}$/.test(toolInput.datum)
          ? toolInput.datum
          : null,
      bedrag:
        typeof toolInput.bedrag === "number" && Number.isFinite(toolInput.bedrag) && toolInput.bedrag > 0
          ? Math.round(toolInput.bedrag * 100) / 100
          : null,
      btw_bedrag:
        typeof toolInput.btw_bedrag === "number" && Number.isFinite(toolInput.btw_bedrag)
          ? Math.round(toolInput.btw_bedrag * 100) / 100
          : null,
      valuta: (toolInput.valuta && String(toolInput.valuta).toUpperCase()) || "EUR",
      leverancier: String(toolInput.leverancier ?? "").trim(),
      categorie: (categorieOk ? toolInput.categorie : "overig") as BonnetjeCategorie,
      omschrijving: String(toolInput.omschrijving ?? "").trim(),
      vertrouwen:
        toolInput.vertrouwen === "hoog" || toolInput.vertrouwen === "laag" ? toolInput.vertrouwen : "medium",
    };

    return NextResponse.json({ kind: "ok", extracted, note: textNote.trim() });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { kind: "error", error: "Anthropic API key is ongeldig." },
        { status: 401 }
      );
    }
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json(
        { kind: "error", error: `Anthropic API (${e.status}): ${e.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { kind: "error", error: e instanceof Error ? e.message : "Onbekende fout." },
      { status: 500 }
    );
  }
}
