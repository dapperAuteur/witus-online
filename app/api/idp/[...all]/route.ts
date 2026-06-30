import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/identity/auth";

// WitUS Accounts IdP endpoints (basePath /api/idp): magic-link, session,
// OIDC discovery (/.well-known/openid-configuration), /oauth2/*, and /jwks.
// Kept on /api/idp so it does NOT collide with NextAuth's /api/auth/[...nextauth].
export const { GET, POST } = toNextJsHandler(auth.handler);
