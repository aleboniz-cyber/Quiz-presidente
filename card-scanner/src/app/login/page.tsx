"use client";

import { getProviders, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [providers, setProviders] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    getProviders().then((p) => setProviders(Object.keys(p ?? {})));
  }, []);

  const hasAzure = providers.includes("azure-ad");
  const hasDev = providers.includes("dev");

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <div className="card" style={{ textAlign: "center" }}>
        <h1>📇 Card Scanner</h1>
        <p className="muted">
          Scansione biglietti da visita e import lead in Salesforce.
        </p>

        {hasAzure && (
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
            onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
          >
            Accedi con Microsoft
          </button>
        )}

        {hasDev && (
          <div style={{ marginTop: hasAzure ? 24 : 16, textAlign: "left" }}>
            {hasAzure && (
              <p className="muted" style={{ textAlign: "center" }}>oppure (solo sviluppo)</p>
            )}
            <label>Email</label>
            <input
              type="email"
              placeholder="tu@azienda.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label>Nome</label>
            <input
              type="text"
              placeholder="Mario Rossi"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              disabled={!email}
              onClick={() =>
                signIn("dev", { email, name, callbackUrl: "/" })
              }
            >
              Entra (login di sviluppo)
            </button>
            <p className="muted" style={{ marginTop: 12 }}>
              Usa un'email presente in <code>ADMIN_EMAILS</code> per accedere anche
              all'area Admin.
            </p>
          </div>
        )}

        {!hasAzure && !hasDev && (
          <p className="muted" style={{ marginTop: 16 }}>
            Nessun metodo di accesso configurato.
          </p>
        )}
      </div>
    </div>
  );
}
