"use client";

import type { LeadFields } from "@/lib/leadSchema";

const FIELDS: { key: keyof LeadFields; label: string; full?: boolean }[] = [
  { key: "firstName", label: "Nome" },
  { key: "lastName", label: "Cognome" },
  { key: "company", label: "Azienda" },
  { key: "title", label: "Ruolo" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefono" },
  { key: "mobile", label: "Cellulare" },
  { key: "website", label: "Sito web" },
  { key: "address", label: "Indirizzo", full: true },
  { key: "city", label: "Città" },
  { key: "country", label: "Paese" },
  { key: "industry", label: "Settore" },
  { key: "estimatedValue", label: "Valore stimato" },
  { key: "nextStep", label: "Prossima azione", full: true }
];

export function LeadForm({
  value,
  onChange
}: {
  value: LeadFields;
  onChange: (v: LeadFields) => void;
}) {
  const set = (k: keyof LeadFields, v: string) =>
    onChange({ ...value, [k]: v });

  return (
    <div>
      <div className="grid2">
        {FIELDS.map((f) => (
          <div key={f.key} style={f.full ? { gridColumn: "1 / -1" } : undefined}>
            <label>{f.label}</label>
            <input
              value={(value[f.key] as string) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}
        <div>
          <label>Priorità (rating)</label>
          <select
            value={value.rating ?? ""}
            onChange={(e) => set("rating", e.target.value)}
          >
            <option value="">—</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </div>
      </div>
      <label>Sintesi AI</label>
      <textarea
        rows={3}
        value={value.aiSummary ?? ""}
        onChange={(e) => set("aiSummary", e.target.value)}
      />
    </div>
  );
}
