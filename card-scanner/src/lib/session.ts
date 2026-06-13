import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface CurrentUser {
  email: string;
  name: string | null;
  role: "admin" | "user";
}

/**
 * Ritorna l'utente corrente dalla sessione, o null se non autenticato.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return {
    email: session.user.email,
    name: session.user.name ?? null,
    role: session.user.role ?? "user"
  };
}
