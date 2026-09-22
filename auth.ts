import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedEmail, parseAllowedEmails } from "@/lib/auth/allowlist";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      const googleProfile = profile as
        | { email?: string; email_verified?: boolean }
        | undefined;
      return isAllowedEmail(
        googleProfile?.email,
        googleProfile?.email_verified,
        parseAllowedEmails(process.env.ALLOWED_EMAILS),
      );
    },
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        return true;
      }
      return Boolean(session);
    },
  },
});
