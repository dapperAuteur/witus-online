import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { jwt, oidcProvider } from "better-auth/plugins";
import { getIdentityDb, identitySchema } from "./db";
import { betterAuthSecret, betterAuthUrl } from "./env";
import { sendIdentityMagicLink } from "./mailer";
import { buildTrustedClients } from "./clients";

/**
 * WitUS Accounts — the ecosystem identity provider.
 *
 * Mounted at basePath `/api/idp` so it coexists with witus.online's existing
 * NextAuth `/api/auth` (no rip-out). First-party ecosystem apps are passed as
 * `trustedClients` (skip consent); each comes online once its
 * `WITUS_OIDC_SECRET__<SLUG>` is set on this project (see lib/identity/clients.ts).
 *
 * NOTE: better-auth 1.6 marks `oidcProvider` deprecated in favor of
 * `@better-auth/oauth-provider`. It is fully functional this major; migrate
 * before the next better-auth major. See plans/21-witus-accounts-idp-buildout.md.
 */
export const auth = betterAuth({
  appName: "WitUS Accounts",
  baseURL: betterAuthUrl(),
  basePath: "/api/idp",
  secret: betterAuthSecret(),
  database: drizzleAdapter(getIdentityDb(), {
    provider: "pg",
    schema: identitySchema,
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => sendIdentityMagicLink(email, url),
    }),
    jwt(),
    oidcProvider({
      loginPage: "/accounts/sign-in",
      useJWTPlugin: true,
      requirePKCE: true,
      storeClientSecret: "hashed",
      trustedClients: buildTrustedClients((name) => process.env[name]),
    }),
    nextCookies(),
  ],
});

export type IdentitySession = typeof auth.$Infer.Session;
