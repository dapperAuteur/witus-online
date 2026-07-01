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
      // MUST be "plain" (the default) while we authenticate apps via `trustedClients`.
      // `storeClientSecret` governs how the token endpoint VERIFIES secrets for ALL
      // clients, and trusted clients carry their secret as plaintext (from the
      // WITUS_OIDC_SECRET__<SLUG> env var, via buildTrustedClients). With "hashed",
      // verifyStoredClientSecret compares hash(incoming_secret) against the stored
      // PLAINTEXT trusted-client secret — which can never match, so EVERY trusted
      // client got 401 invalid_client at POST /oauth2/token (observed on learn +
      // would hit centos too). Only switch away from "plain" if/when clients move to
      // DB-backed dynamic registration (where secrets are stored hashed at rest).
      storeClientSecret: "plain",
      // Guarantee a non-empty `name` claim. Users sign up here via magic link, which
      // collects only email, so user.name is often "" — and the oidcProvider builds
      // the `name` claim straight from user.name. A client's better-auth genericOAuth
      // rejects a profile with no name (redirects with ?error=name_is_missing, seen on
      // learn.witus.online). This runs in the /userinfo claim builder AFTER the base
      // profile claims and overrides them, so it fixes existing accounts at runtime
      // (no DB backfill) for every client. Only fills a name when one is actually
      // missing; users with a real name are untouched.
      getAdditionalUserInfoClaim: (user, scopes) => {
        if (!scopes?.includes("profile")) return {};
        if (user.name && user.name.trim()) return {};
        const fallback = user.email?.split("@")[0] || "WitUS user";
        return { name: fallback, given_name: fallback };
      },
      trustedClients: buildTrustedClients((name) => process.env[name]),
    }),
    nextCookies(),
  ],
});

export type IdentitySession = typeof auth.$Infer.Session;
