import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { isAdminEmail } from "./authz";

/**
 * Configurazione NextAuth con SSO Microsoft Entra ID.
 * Il ruolo (admin/user) viene calcolato in base a ADMIN_EMAILS e
 * iniettato nel token JWT e nella sessione.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "",
      authorization: { params: { scope: "openid profile email User.Read" } }
    })
  ],
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
