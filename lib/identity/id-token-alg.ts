/**
 * The algorithm accounts.witus.online signs ID tokens with, as seen by every NextAuth v4 client.
 *
 * The IdP runs Better-Auth's oidcProvider with `useJWTPlugin: true` (lib/identity/auth.ts), so
 * ID tokens are signed with the JWT plugin's key pair. Its JWKS (https://accounts.witus.online/api/idp/jwks)
 * holds one Ed25519 key, so tokens carry `alg: EdDSA`. Discovery also lists RS256, but no RSA key
 * exists, so RS256 is never actually used.
 *
 * NextAuth v4 validates ID tokens through openid-client 5, whose client metadata defaults to
 * `id_token_signed_response_alg: "RS256"`. Without this override every "Sign in with WitUS" on a
 * NextAuth app fails at the callback with "unexpected JWT alg received, expected RS256, got: EdDSA",
 * which NextAuth reports as `?error=OAuthCallback` (seen on witus.online 2026-10-16).
 *
 * `node scripts/check-idp-id-token-alg.mjs` compares this value with the live JWKS. If the IdP's
 * keys ever change algorithm, that check fails before sign-in does.
 *
 * No `server-only` import here on purpose: the check script loads this file directly.
 */
export const WITUS_ID_TOKEN_ALG = "EdDSA";
