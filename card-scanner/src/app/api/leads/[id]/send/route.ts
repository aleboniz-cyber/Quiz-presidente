import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendLeadToSalesforce } from "@/lib/salesforce";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/leads/[id]/send
 * Invia il singolo record a Salesforce e riporta l'esito (successo / duplicato / errore).
 */
export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (lead.ownerEmail !== user.email && user.role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const result = await sendLeadToSalesforce(lead);

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      status: result.status,
      salesforceId: result.salesforceId ?? lead.salesforceId,
      salesforceType: result.salesforceType ?? lead.salesforceType,
      importMessage: result.message,
      sentAt: result.status === "SENT" ? new Date() : lead.sentAt
    }
  });

  return NextResponse.json({ result, lead: updated });
}
