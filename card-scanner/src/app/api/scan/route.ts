import { NextResponse } from "next/server";
import { z } from "zod";
import { ocrBusinessCard } from "@/lib/claude";
import { getCurrentUser } from "@/lib/session";

const bodySchema = z.object({ imageDataUrl: z.string().min(10) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Immagine mancante" }, { status: 400 });
  }

  try {
    const rawOcr = await ocrBusinessCard(parsed.data.imageDataUrl);
    return NextResponse.json({ rawOcr });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore OCR" },
      { status: 500 }
    );
  }
}
