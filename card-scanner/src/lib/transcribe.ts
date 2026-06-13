/**
 * Trascrizione audio delle note vocali del sales.
 * Provider configurabile via TRANSCRIBE_PROVIDER: "openai" | "azure" | "none".
 * Nota: Claude non trascrive audio nativamente, quindi questo step usa un
 * provider dedicato. L'output testuale viene poi passato all'analisi Claude.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  contentType: string
): Promise<string> {
  const provider = (process.env.TRANSCRIBE_PROVIDER ?? "none").toLowerCase();

  if (provider === "openai") return transcribeOpenAI(audioBuffer, contentType);
  if (provider === "azure") return transcribeAzure(audioBuffer, contentType);

  return "[MOCK TRASCRIZIONE] Imposta TRANSCRIBE_PROVIDER (openai|azure) per la trascrizione reale.";
}

async function transcribeOpenAI(
  audioBuffer: Buffer,
  contentType: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY mancante");

  const form = new FormData();
  const ext = contentType.includes("wav") ? "wav" : "webm";
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: contentType }),
    `note.${ext}`
  );
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  if (!res.ok) throw new Error(`Whisper error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { text: string };
  return json.text;
}

async function transcribeAzure(
  audioBuffer: Buffer,
  contentType: string
): Promise<string> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error("AZURE_SPEECH_KEY/REGION mancanti");

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=it-IT`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": contentType || "audio/webm; codecs=opus",
      Accept: "application/json"
    },
    body: new Uint8Array(audioBuffer)
  });
  if (!res.ok) throw new Error(`Azure Speech error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { DisplayText?: string };
  return json.DisplayText ?? "";
}
