import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendStoredLead, type SendOutcome } from "@/lib/sendLead";

const bodySchema = z.object({
  // Lista esplicita di id; se omessa/vuota con all=true invia tutti i
  // lead non ancora inviati dell'utente (o di tutti, se admin).
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional()
});

/**
 * POST /api/leads/send-bulk
 * Invia piu' record a Salesforce in un'unica chiamata e riporta l'esito
 * aggregato (quanti inviati, duplicati, falliti) + il dettaglio per record.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  let ids = parsed.data.ids ?? [];

  // Se richiesto "tutti", seleziona i lead non ancora inviati con successo.
  if (parsed.data.all || ids.length === 0) {
    const where = {
      status: { not: "SENT" as const },
      ...(user.role === "admin" ? {} : { ownerEmail: user.email })
    };
    const pending = await prisma.lead.findMany({
      where,
      select: { id: true }
    });
    ids = pending.map((l) => l.id);
  }

  // Invio sequenziale per non saturare i limiti API di Salesforce.
  const results: SendOutcome[] = [];
  for (const id of ids) {
    const { outcome } = await sendStoredLead(id, user);
    results.push(outcome);
  }

  const summary = {
    total: results.length,
    sent: results.filter((r) => r.status === "SENT").length,
    duplicate: results.filter((r) => r.status === "DUPLICATE").length,
    failed: results.filter((r) => r.status === "FAILED").length
  };

  return NextResponse.json({ summary, results });
}
