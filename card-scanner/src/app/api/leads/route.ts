import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveLeadSchema } from "@/lib/leadSchema";

// GET /api/leads -> i lead dell'utente corrente
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const leads = await prisma.lead.findMany({
    where: { ownerEmail: user.email },
    orderBy: { updatedAt: "desc" }
  });
  return NextResponse.json({ leads });
}

// POST /api/leads -> salva una nuova scheda lead (bozza)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const parsed = saveLeadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      ownerEmail: user.email,
      ownerName: user.name,
      status: "DRAFT"
    }
  });
  return NextResponse.json({ lead }, { status: 201 });
}
