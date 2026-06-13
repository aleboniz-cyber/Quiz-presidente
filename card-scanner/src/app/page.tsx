"use client";

import { useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { LeadForm } from "@/components/LeadForm";
import type { LeadFields } from "@/lib/leadSchema";

type Step = "capture" | "notes" | "preview" | "done";

export default function ScanFlowPage() {
  const [step, setStep] = useState<Step>("capture");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [rawOcr, setRawOcr] = useState("");
  const [textNotes, setTextNotes] = useState("");
  const [audioTranscript, setAudioTranscript] = useState("");
  const [fields, setFields] = useState<LeadFields>({});
  const [result, setResult] = useState<{ status: string; message: string } | null>(
    null
  );

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  async function handleImage(file: File) {
    setError(null);
    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);
    setBusy("Lettura biglietto (OCR)…");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRawOcr(json.rawOcr);
      setStep("notes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore OCR");
    } finally {
      setBusy(null);
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => chunksRef.current.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setBusy("Trascrizione note vocali…");
      try {
        const form = new FormData();
        form.append("audio", blob, "note.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setAudioTranscript((prev) => (prev ? prev + " " : "") + json.transcript);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore trascrizione");
      } finally {
        setBusy(null);
      }
    };
    rec.start();
    mediaRef.current = rec;
    setRecording(true);
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function runAnalysis() {
    setError(null);
    setBusy("Analisi AI dei dati e delle note…");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawOcr, textNotes, audioTranscript })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setFields(json.fields);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore analisi");
    } finally {
      setBusy(null);
    }
  }

  async function saveAndSend(send: boolean) {
    setError(null);
    setBusy(send ? "Salvataggio e invio a Salesforce…" : "Salvataggio…");
    try {
      const saveRes = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          textNotes,
          audioTranscript,
          rawOcr,
          cardImageRef: imageDataUrl
        })
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.error);

      if (send) {
        const sendRes = await fetch(`/api/leads/${saveJson.lead.id}/send`, {
          method: "POST"
        });
        const sendJson = await sendRes.json();
        if (!sendRes.ok) throw new Error(sendJson.error);
        setResult(sendJson.result);
      } else {
        setResult({ status: "DRAFT", message: "Scheda salvata come bozza." });
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setStep("capture");
    setImageDataUrl(null);
    setRawOcr("");
    setTextNotes("");
    setAudioTranscript("");
    setFields({});
    setResult(null);
    setError(null);
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="steps">
          <span className={step === "capture" ? "active" : ""}>1. Scansione</span>
          <span>›</span>
          <span className={step === "notes" ? "active" : ""}>2. Note</span>
          <span>›</span>
          <span className={step === "preview" ? "active" : ""}>3. Anteprima</span>
          <span>›</span>
          <span className={step === "done" ? "active" : ""}>4. Esito</span>
        </div>

        {error && (
          <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)" }}>
            {error}
          </div>
        )}
        {busy && <div className="card">⏳ {busy}</div>}

        {step === "capture" && (
          <div className="card">
            <h2>Scansiona il biglietto</h2>
            <p className="muted">Scatta una foto o carica un'immagine del biglietto.</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
            />
            {imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageDataUrl}
                alt="biglietto"
                style={{ maxWidth: "100%", marginTop: 12, borderRadius: 8 }}
              />
            )}
          </div>
        )}

        {step === "notes" && (
          <div className="card">
            <h2>Note del sales</h2>
            <label>Testo letto dal biglietto (OCR) — modificabile</label>
            <textarea rows={4} value={rawOcr} onChange={(e) => setRawOcr(e.target.value)} />

            <label>Note testuali</label>
            <textarea
              rows={3}
              placeholder="Es. interessato a integrazione CRM, budget 20k, ricontattare a settembre…"
              value={textNotes}
              onChange={(e) => setTextNotes(e.target.value)}
            />

            <label>Note vocali</label>
            <div style={{ display: "flex", gap: 8 }}>
              {!recording ? (
                <button className="btn secondary" onClick={startRecording}>
                  🎙️ Registra
                </button>
              ) : (
                <button className="btn danger" onClick={stopRecording}>
                  ⏹ Ferma
                </button>
              )}
            </div>
            {audioTranscript && (
              <textarea
                rows={2}
                style={{ marginTop: 8 }}
                value={audioTranscript}
                onChange={(e) => setAudioTranscript(e.target.value)}
              />
            )}

            <div style={{ marginTop: 16 }}>
              <button className="btn" onClick={runAnalysis} disabled={!!busy}>
                Analizza →
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="card">
            <h2>Anteprima scheda lead</h2>
            <p className="muted">
              Verifica e correggi i dati elaborati dall'AI prima di salvare.
            </p>
            <LeadForm value={fields} onChange={setFields} />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn secondary" onClick={() => saveAndSend(false)} disabled={!!busy}>
                Salva bozza
              </button>
              <button className="btn" onClick={() => saveAndSend(true)} disabled={!!busy}>
                Salva e invia a Salesforce
              </button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="card">
            <h2>Esito</h2>
            <p>
              <span className={`badge ${result.status}`}>{result.status}</span>
            </p>
            <p>{result.message}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={reset}>
                Nuova scansione
              </button>
              <a className="btn secondary" href="/leads">
                Vai ai miei lead
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
