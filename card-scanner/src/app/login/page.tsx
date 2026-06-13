"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <div className="card" style={{ textAlign: "center" }}>
        <h1>📇 Card Scanner</h1>
        <p className="muted">
          Scansione biglietti da visita e import lead in Salesforce.
        </p>
        <button
          className="btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
          onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
        >
          Accedi con Microsoft
        </button>
        <p className="muted" style={{ marginTop: 16 }}>
          L'accesso è consentito solo agli utenti aziendali tramite SSO Microsoft.
        </p>
      </div>
    </div>
  );
}
