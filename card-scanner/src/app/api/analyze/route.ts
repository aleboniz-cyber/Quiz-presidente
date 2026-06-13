import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeLead } from "@/lib/claude";
import { getCurrentUser } from "@/lib/session";

const bodySchema = z.object({
  rawOcr: z.string().optional(),
  textNotes: z.string().optional(),
  audioTranscript: z.string().optional()
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  try {
    const fields = await analyzeLead(parsed.data);
    return NextResponse.json({ fields });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore analisi" },
      { status: 500 }
    );
  }
}
