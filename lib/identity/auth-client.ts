import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser client for the WitUS Accounts IdP. baseURL defaults to the current
// origin (accounts.witus.online); basePath matches the server mount.
export const identityAuthClient = createAuthClient({
  basePath: "/api/idp",
  plugins: [magicLinkClient()],
});
