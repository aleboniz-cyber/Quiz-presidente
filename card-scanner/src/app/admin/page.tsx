"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TopBar } from "@/components/TopBar";

interface AdminLead {
  id: string;
  ownerEmail: string;
  ownerName: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  status: string;
  importMessage: string | null;
  updatedAt: string;
}

interface StatRow {
  status: string;
  _count: { _all: number };
}

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  async function load() {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/leads${qs}`);
    if (res.status === 403) {
      setDenied(true);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setLeads(json.leads ?? []);
    setStats(json.stats ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (authStatus === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, statusFilter]);

  if (denied || session?.user?.role !== "admin") {
    return (
      <>
        <TopBar />
        <div className="container">
          <div className="card">Area riservata agli amministratori.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="container" style={{ maxWidth: 1000 }}>
        <h1>Amministrazione — tutti i record</h1>

        <div className="card" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {stats.map((s) => (
            <div key={s.status}>
              <span className={`badge ${s.status}`}>{s.status}</span>{" "}
              <strong>{s._count._all}</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <label>Filtra per stato</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tutti</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="DUPLICATE">DUPLICATE</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        {loading ? (
          <p className="muted">Caricamento…</p>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Sales</th>
                  <th>Contatto</th>
                  <th>Azienda</th>
                  <th>Stato</th>
                  <th>Aggiornato</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.ownerName ?? "—"}
                      <div className="muted">{l.ownerEmail}</div>
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
                    <td className="muted">
                      {new Date(l.updatedAt).toLocaleString("it-IT")}
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
