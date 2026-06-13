/**
 * Logica di autorizzazione: chi e' admin.
 * Gli admin (definiti via ADMIN_EMAILS) vedono i record di tutti gli utenti
 * e sono gli unici a poter usare l'integrazione Salesforce.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
