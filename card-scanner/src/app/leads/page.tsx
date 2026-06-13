"use client";

import { useEffect, useMemo, useState } from "react";
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

interface BulkSummary {
  total: number;
  sent: number;
  duplicate: number;
  failed: number;
}

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<BulkSummary | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/leads");
    const json = await res.json();
    setLeads(json.leads ?? []);
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const pendingIds = useMemo(
    () => leads.filter((l) => l.status !== "SENT").map((l) => l.id),
    [leads]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === pendingIds.length ? new Set() : new Set(pendingIds)
    );
  }

  async function sendBulk(ids: string[], all = false) {
    if (!all && ids.length === 0) return;
    setBusy(true);
    setSummary(null);
    const res = await fetch("/api/leads/send-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { ids })
    });
    const json = await res.json();
    setSummary(json.summary ?? null);
    setBusy(false);
    load();
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <h1>I miei lead</h1>

        {leads.length > 0 && (
          <div
            className="card"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <button
              className="btn"
              disabled={busy || selected.size === 0}
              onClick={() => sendBulk([...selected])}
            >
              {busy ? "Invio…" : `Invia selezionati (${selected.size})`}
            </button>
            <button
              className="btn secondary"
              disabled={busy || pendingIds.length === 0}
              onClick={() => sendBulk([], true)}
            >
              Invia tutti i non inviati ({pendingIds.length})
            </button>
          </div>
        )}

        {summary && (
          <div className="card">
            <strong>Esito import massivo</strong>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              <span>Totale: {summary.total}</span>
              <span className="badge SENT">Inviati: {summary.sent}</span>
              <span className="badge DUPLICATE">Duplicati: {summary.duplicate}</span>
              <span className="badge FAILED">Falliti: {summary.failed}</span>
            </div>
          </div>
        )}

        {loading ? (
          <p className="muted">Caricamento…</p>
        ) : leads.length === 0 ? (
          <p className="muted">Nessun lead salvato. Vai su “Scansiona”.</p>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        pendingIds.length > 0 && selected.size === pendingIds.length
                      }
                      onChange={toggleAll}
                      style={{ width: "auto" }}
                    />
                  </th>
                  <th>Nome</th>
                  <th>Azienda</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.status !== "SENT" && (
                        <input
                          type="checkbox"
                          checked={selected.has(l.id)}
                          onChange={() => toggle(l.id)}
                          style={{ width: "auto" }}
                        />
                      )}
                    </td>
                    <td>
                      {l.fullName || `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || "—"}
                      <div className="muted">{l.email}</div>
                    </td>
                    <td>{l.company ?? "—"}</td>
                    <td>
                      <span className={`badge ${l.status}`}>{l.status}</span>
                      {l.importMessage && <div className="muted">{l.importMessage}</div>}
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
