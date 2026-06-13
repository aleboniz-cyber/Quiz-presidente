import { prisma } from "./prisma";
import { sendLeadToSalesforce, type SalesforceSendResult } from "./salesforce";
import type { CurrentUser } from "./session";

export interface SendOutcome extends SalesforceSendResult {
  id: string;
  name: string;
}

/**
 * Invia a Salesforce un lead salvato (per id), applicando il controllo di
 * proprieta' (owner o admin) e aggiornando lo stato sul DB.
 * Usato sia dall'invio singolo sia dall'invio massivo.
 */
export async function sendStoredLead(
  id: string,
  user: CurrentUser
): Promise<{ outcome: SendOutcome; httpStatus: number }> {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return {
      httpStatus: 404,
      outcome: { id, name: id, status: "FAILED", message: "Lead non trovato" }
    };
  }
  if (lead.ownerEmail !== user.email && user.role !== "admin") {
    return {
      httpStatus: 403,
      outcome: { id, name: id, status: "FAILED", message: "Non autorizzato" }
    };
  }

  const result = await sendLeadToSalesforce(lead);

  await prisma.lead.update({
    where: { id },
    data: {
      status: result.status,
      salesforceId: result.salesforceId ?? lead.salesforceId,
      salesforceType: result.salesforceType ?? lead.salesforceType,
      importMessage: result.message,
      sentAt: result.status === "SENT" ? new Date() : lead.sentAt
    }
  });

  const name =
    lead.fullName ||
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
    lead.company ||
    lead.email ||
    id;

  return { httpStatus: 200, outcome: { id, name, ...result } };
}
