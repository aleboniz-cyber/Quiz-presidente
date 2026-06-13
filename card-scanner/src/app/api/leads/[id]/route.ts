import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveLeadSchema } from "@/lib/leadSchema";

type Params = { params: Promise<{ id: string }> };

async function loadOwned(id: string, email: string, isAdmin: boolean) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return null;
  if (lead.ownerEmail !== email && !isAdmin) return "forbidden" as const;
  return lead;
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const lead = await loadOwned(id, user.email, user.role === "admin");
  if (!lead) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (lead === "forbidden")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  return NextResponse.json({ lead });
}

export async function PUT(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const existing = await loadOwned(id, user.email, user.role === "admin");
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (existing === "forbidden")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const parsed = saveLeadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const lead = await prisma.lead.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ lead });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const existing = await loadOwned(id, user.email, user.role === "admin");
  if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  if (existing === "forbidden")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
