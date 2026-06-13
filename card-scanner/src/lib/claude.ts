import Anthropic from "@anthropic-ai/sdk";
import { leadFieldsSchema, type LeadFields } from "./leadSchema";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

/**
 * Tool schema usato per forzare Claude a restituire JSON strutturato
 * con i campi della scheda lead.
 */
const extractTool: Anthropic.Tool = {
  name: "extract_lead",
  description:
    "Estrae e normalizza i dati di un lead da un biglietto da visita e dalle note del sales.",
  input_schema: {
    type: "object",
    properties: {
      firstName: { type: "string", description: "Nome" },
      lastName: { type: "string", description: "Cognome" },
      fullName: { type: "string", description: "Nome completo" },
      company: { type: "string", description: "Azienda" },
      title: { type: "string", description: "Ruolo / posizione" },
      email: { type: "string", description: "Email" },
      phone: { type: "string", description: "Telefono fisso" },
      mobile: { type: "string", description: "Cellulare" },
      website: { type: "string", description: "Sito web" },
      address: { type: "string", description: "Indirizzo" },
      city: { type: "string", description: "Citta'" },
      country: { type: "string", description: "Paese" },
      industry: { type: "string", description: "Settore merceologico dedotto" },
      leadSource: { type: "string", description: "Sorgente lead" },
      rating: {
        type: "string",
        enum: ["Hot", "Warm", "Cold"],
        description: "Priorita' del lead dedotta dalle note"
      },
      estimatedValue: {
        type: "string",
        description: "Valore stimato dell'opportunita' se citato nelle note"
      },
      nextStep: { type: "string", description: "Prossima azione suggerita" },
      aiSummary: {
        type: "string",
        description: "Breve sintesi (1-2 frasi) del lead per il sales"
      }
    },
    required: []
  }
};

/**
 * OCR: estrae il testo grezzo da un'immagine di biglietto da visita.
 * Se ANTHROPIC_API_KEY non e' configurata, ritorna un mock per far girare l'app.
 */
export async function ocrBusinessCard(imageDataUrl: string): Promise<string> {
  const client = getClient();
  if (!client) {
    return "[MOCK OCR] Mario Rossi\nAcme S.p.A.\nSales Director\nmario.rossi@acme.it\n+39 02 1234567";
  }

  const { mediaType, data } = parseDataUrl(imageDataUrl);

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data }
          },
          {
            type: "text",
            text: "Trascrivi fedelmente TUTTO il testo presente su questo biglietto da visita, riga per riga, senza commenti."
          }
        ]
      }
    ]
  });

  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Analisi: combina OCR + note testuali/audio ed estrae i campi della scheda lead.
 * Se ANTHROPIC_API_KEY non e' configurata, ritorna un parsing euristico minimale.
 */
export async function analyzeLead(input: {
  rawOcr?: string;
  textNotes?: string;
  audioTranscript?: string;
}): Promise<LeadFields> {
  const client = getClient();
  if (!client) {
    return mockAnalyze(input);
  }

  const contextText = [
    input.rawOcr ? `TESTO BIGLIETTO (OCR):\n${input.rawOcr}` : "",
    input.textNotes ? `NOTE TESTUALI DEL SALES:\n${input.textNotes}` : "",
    input.audioTranscript
      ? `TRASCRIZIONE NOTE VOCALI:\n${input.audioTranscript}`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    tools: [extractTool],
    tool_choice: { type: "tool", name: "extract_lead" },
    messages: [
      {
        role: "user",
        content: `Sei un assistente CRM. Analizza le informazioni seguenti raccolte da un sales durante un evento e compila la scheda lead.
Deduci settore, priorita' (rating) e prossima azione dalle note quando possibile. Normalizza email/telefoni. Non inventare dati assenti.

${contextText}`
      }
    ]
  });

  const toolUse = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) return mockAnalyze(input);

  const parsed = leadFieldsSchema.safeParse(toolUse.input);
  return parsed.success ? parsed.data : mockAnalyze(input);
}

function parseDataUrl(dataUrl: string): {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
} {
  const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    // assume gia' base64 jpeg grezzo
    return { mediaType: "image/jpeg", data: dataUrl.replace(/^data:.*,/, "") };
  }
  return {
    mediaType: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
    data: match[2]
  };
}

function mockAnalyze(input: {
  rawOcr?: string;
  textNotes?: string;
}): LeadFields {
  const ocr = input.rawOcr ?? "";
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(ocr)?.[0] ?? null;
  const lines = ocr.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    fullName: lines[0] ?? null,
    company: lines[1] ?? null,
    title: lines[2] ?? null,
    email,
    leadSource: "Business Card",
    rating: "Warm",
    aiSummary:
      "[MOCK] Configura ANTHROPIC_API_KEY per l'analisi reale dei dati e delle note."
  };
}
