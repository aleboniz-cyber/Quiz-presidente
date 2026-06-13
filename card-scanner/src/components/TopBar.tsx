"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function TopBar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="topbar">
      <div className="brand">📇 Card Scanner</div>
      <nav>
        <Link href="/">Scansiona</Link>
        <Link href="/leads">I miei lead</Link>
        {isAdmin && <Link href="/admin">Admin</Link>}
        {session?.user && (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              signOut({ callbackUrl: "/login" });
            }}
          >
            Esci
          </a>
        )}
      </nav>
    </header>
  );
}
