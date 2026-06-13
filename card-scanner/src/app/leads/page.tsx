"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";

interface LeadRow {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  status: string;
  importMessage: string | null;
  salesforceId: string | null;
}

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/leads");
    const json = await res.json();
    setLeads(json.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function send(id: string) {
    setSending(id);
    await fetch(`/api/leads/${id}/send`, { method: "POST" });
    setSending(null);
    load();
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <h1>I miei lead</h1>
        {loading ? (
          <p className="muted">Caricamento…</p>
        ) : leads.length === 0 ? (
          <p className="muted">Nessun lead salvato. Vai su “Scansiona”.</p>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Azienda</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.fullName || `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || "—"}
                      <div className="muted">{l.email}</div>
                    </td>
                    <td>{l.company ?? "—"}</td>
                    <td>
                      <span className={`badge ${l.status}`}>{l.status}</span>
                      {l.importMessage && (
                        <div className="muted">{l.importMessage}</div>
                      )}
                    </td>
                    <td>
                      {l.status !== "SENT" && (
                        <button
                          className="btn secondary"
                          onClick={() => send(l.id)}
                          disabled={sending === l.id}
                        >
                          {sending === l.id ? "Invio…" : "Invia a SF"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
