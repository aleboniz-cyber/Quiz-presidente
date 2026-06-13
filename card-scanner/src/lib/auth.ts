import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { isAdminEmail } from "./authz";

const azureConfigured = Boolean(
  process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
);

// Login di sviluppo / demo:
// - in locale: attivo se l'SSO Microsoft non e' configurato;
// - online: attivabile esplicitamente con ALLOW_DEV_LOGIN="true" (solo per demo,
//   da rimuovere prima dell'uso reale).
const devLoginEnabled =
  process.env.ALLOW_DEV_LOGIN === "true" ||
  (process.env.NODE_ENV !== "production" && !azureConfigured);

const providers: NextAuthOptions["providers"] = [];

if (azureConfigured) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "",
      authorization: { params: { scope: "openid profile email User.Read" } }
    })
  );
}

if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Dev login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Nome", type: "text" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        if (!email) return null;
        return {
          id: email,
          email,
          name: credentials?.name?.trim() || email
        };
      }
    })
  );
}

/**
 * Configurazione NextAuth.
 * - Produzione: SSO Microsoft Entra ID.
 * - Locale (senza Azure): login di sviluppo con sola email.
 * Il ruolo (admin/user) viene calcolato da ADMIN_EMAILS.
 */
export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      const email = (token.email as string | undefined) ?? null;
      token.role = isAdminEmail(email) ? "admin" : "user";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as "admin" | "user") ?? "user";
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};
