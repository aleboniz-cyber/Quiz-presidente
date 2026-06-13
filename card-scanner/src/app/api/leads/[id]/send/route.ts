import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { sendStoredLead } from "@/lib/sendLead";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/leads/[id]/send
 * Invia il singolo record a Salesforce e riporta l'esito (successo / duplicato / errore).
 */
export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const { outcome, httpStatus } = await sendStoredLead(id, user);
  if (httpStatus !== 200) {
    return NextResponse.json({ error: outcome.message }, { status: httpStatus });
  }
  return NextResponse.json({ result: outcome });
}
