import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { removePushSubscriptionByEndpoint } from "@/lib/repo/push-subscriptions";

export const dynamic = "force-dynamic";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: Request) {
  const user = await requireUser();
  try {
    const body = schema.parse(await req.json());
    await removePushSubscriptionByEndpoint(user.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Onbekende fout." },
      { status: 400 }
    );
  }
}
