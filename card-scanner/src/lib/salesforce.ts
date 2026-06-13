import jsforce, { Connection } from "jsforce";

/**
 * Integrazione Salesforce - gestita SOLO a livello admin tramite variabili
 * d'ambiente lato server. Nessuna credenziale Salesforce raggiunge mai il client.
 */

export interface SalesforceSendResult {
  status: "SENT" | "DUPLICATE" | "FAILED";
  salesforceId?: string;
  salesforceType?: "Lead" | "Contact";
  message: string;
}

/** Forma "loose" del lead accettata dall'invio (i campi DB sono stringhe). */
export interface LeadSendInput {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  company?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  industry?: string | null;
  leadSource?: string | null;
  rating?: string | null;
  aiSummary?: string | null;
  nextStep?: string | null;
  textNotes?: string | null;
  audioTranscript?: string | null;
}

export function isSalesforceConfigured(): boolean {
  return Boolean(
    process.env.SALESFORCE_CLIENT_ID &&
      process.env.SALESFORCE_USERNAME &&
      process.env.SALESFORCE_PASSWORD
  );
}

async function getConnection(): Promise<Connection> {
  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl: process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com",
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET
    },
    loginUrl: process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com"
  });

  const password = `${process.env.SALESFORCE_PASSWORD ?? ""}${
    process.env.SALESFORCE_SECURITY_TOKEN ?? ""
  }`;
  await conn.login(process.env.SALESFORCE_USERNAME ?? "", password);
  return conn;
}

/**
 * Verifica se esiste gia' un Lead con la stessa email su Salesforce.
 */
async function findExistingLead(
  conn: Connection,
  email: string
): Promise<{ Id: string } | null> {
  const escaped = email.replace(/'/g, "\\'");
  const result = await conn.query<{ Id: string }>(
    `SELECT Id FROM Lead WHERE Email = '${escaped}' LIMIT 1`
  );
  return result.records[0] ?? null;
}

/**
 * Invia un singolo lead a Salesforce.
 * - se l'email esiste gia' come Lead -> ritorna DUPLICATE
 * - altrimenti crea un nuovo Lead -> ritorna SENT
 */
export async function sendLeadToSalesforce(
  lead: LeadSendInput
): Promise<SalesforceSendResult> {
  if (!isSalesforceConfigured()) {
    // Modalita' mock: l'app gira anche senza credenziali Salesforce.
    return {
      status: "FAILED",
      message:
        "Integrazione Salesforce non configurata. L'admin deve impostare le variabili SALESFORCE_*."
    };
  }

  try {
    const conn = await getConnection();

    if (lead.email) {
      const existing = await findExistingLead(conn, lead.email);
      if (existing) {
        return {
          status: "DUPLICATE",
          salesforceId: existing.Id,
          salesforceType: "Lead",
          message: `Lead gia' esistente su Salesforce (Id ${existing.Id}). Import non duplicato.`
        };
      }
    }

    const lastName = lead.lastName || lead.fullName || "Sconosciuto";
    const description = [
      lead.aiSummary ? `Sintesi AI: ${lead.aiSummary}` : "",
      lead.nextStep ? `Prossima azione: ${lead.nextStep}` : "",
      lead.textNotes ? `Note: ${lead.textNotes}` : "",
      lead.audioTranscript ? `Note vocali: ${lead.audioTranscript}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const payload: Record<string, unknown> = {
      FirstName: lead.firstName || undefined,
      LastName: lastName,
      Company: lead.company || "N/D",
      Title: lead.title || undefined,
      Email: lead.email || undefined,
      Phone: lead.phone || undefined,
      MobilePhone: lead.mobile || undefined,
      Website: lead.website || undefined,
      Street: lead.address || undefined,
      City: lead.city || undefined,
      Country: lead.country || undefined,
      Industry: lead.industry || undefined,
      LeadSource: lead.leadSource || "Business Card",
      Rating: lead.rating || undefined,
      Description: description || undefined
    };

    const result = await conn.sobject("Lead").create(payload);
    if (result.success) {
      return {
        status: "SENT",
        salesforceId: result.id,
        salesforceType: "Lead",
        message: `Lead creato su Salesforce (Id ${result.id}).`
      };
    }
    return {
      status: "FAILED",
      message: `Creazione fallita: ${JSON.stringify(result.errors)}`
    };
  } catch (err) {
    return {
      status: "FAILED",
      message: `Errore Salesforce: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
