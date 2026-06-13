export { default } from "next-auth/middleware";

/**
 * Protegge tutte le rotte tranne login, asset statici e gli endpoint di auth.
 * L'accesso all'app richiede sempre il login SSO Microsoft.
 */
export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"
  ]
};
