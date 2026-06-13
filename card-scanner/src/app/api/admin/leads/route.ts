import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * GET /api/admin/leads -> tutti i record di tutti gli utenti (solo admin).
 * Filtri opzionali: ?owner=email&status=SENT
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Solo amministratori" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const leads = await prisma.lead.findMany({
    where: {
      ownerEmail: owner || undefined,
      status: status ? (status as never) : undefined
    },
    orderBy: { updatedAt: "desc" }
  });

  const stats = await prisma.lead.groupBy({
    by: ["status"],
    _count: { _all: true }
  });

  return NextResponse.json({ leads, stats });
}
