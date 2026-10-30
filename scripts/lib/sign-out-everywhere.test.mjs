// Sign-out meaning (BAM, 2026-10-29, witus task 128 option (b)): "Sign out" is local to
// witus.online; "Sign out of WitUS everywhere" also ends the WitUS session at the IdP.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  SIGN_OUT_LABEL,
  endSessionEndpointFallback,
  endSessionUrlWithClientId,
  signOutEverywhere,
  withPostLogoutRedirect,
} from "../../lib/identity/sign-out-everywhere.mjs";

const ENDPOINT = "https://accounts.witus.online/api/idp/oauth2/endsession";
const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("exact accessible names and help text", () => {
  assert.equal(SIGN_OUT_LABEL, "Sign out");
  assert.equal(SIGN_OUT_EVERYWHERE_LABEL, "Sign out of WitUS everywhere");
  assert.equal(
    SIGN_OUT_EVERYWHERE_HELP,
    "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them."
  );
});

test("end-session URL carries client_id, and is null without a client id or endpoint", () => {
  assert.equal(endSessionUrlWithClientId(ENDPOINT, "witus-online"), `${ENDPOINT}?client_id=witus-online`);
  assert.equal(endSessionUrlWithClientId(ENDPOINT, undefined), null);
  assert.equal(endSessionUrlWithClientId(null, "witus-online"), null);
});

test("fallback endpoint sits beside the discovery document", () => {
  assert.equal(
    endSessionEndpointFallback("https://accounts.witus.online/api/idp/.well-known/openid-configuration"),
    ENDPOINT
  );
  assert.equal(endSessionEndpointFallback("https://example.test/not-discovery"), null);
});

test("post_logout_redirect_uri is the encoded origin with a trailing slash", () => {
  assert.equal(
    withPostLogoutRedirect(`${ENDPOINT}?client_id=witus-online`, "https://www.witus.online"),
    `${ENDPOINT}?client_id=witus-online&post_logout_redirect_uri=${encodeURIComponent("https://www.witus.online/")}`
  );
});

test("everywhere: local sign-out finishes before the IdP navigation", async () => {
  const calls = [];
  await signOutEverywhere({
    signOutLocal: async () => {
      await new Promise((r) => setTimeout(r, 5));
      calls.push("local");
    },
    navigate: (url) => calls.push(url),
    endSessionUrl: `${ENDPOINT}?client_id=witus-online`,
    origin: "https://www.witus.online",
  });
  assert.equal(calls[0], "local");
  assert.match(calls[1], /^https:\/\/accounts\.witus\.online\/api\/idp\/oauth2\/endsession\?client_id=witus-online&post_logout_redirect_uri=/);
});

test("everywhere: a failed local sign-out still reaches the IdP", async () => {
  const urls = [];
  await signOutEverywhere({
    signOutLocal: async () => {
      throw new Error("network");
    },
    navigate: (url) => urls.push(url),
    endSessionUrl: `${ENDPOINT}?client_id=witus-online`,
    origin: "https://www.witus.online",
  });
  assert.equal(urls.length, 1);
});

test("plain Sign out controls never go to the IdP", () => {
  for (const file of ["app/admin/SignOutButton.tsx", "components/HeaderAuth.tsx"]) {
    // Code only: comments may name the other control.
    const s = src(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(s, /endsession|end_session|signOutEverywhere\(|window\.location/i, file);
    assert.match(s, /signOut\(\{ callbackUrl: "\/" \}\)/, file);
  }
});

test("everywhere control: hidden without a URL, help text linked by aria-describedby", () => {
  const s = src("app/admin/SignOutEverywhereButton.tsx");
  assert.match(s, /if \(!endSessionUrl\) return null;/);
  assert.match(s, /aria-describedby=\{helpId\}/);
  assert.match(s, /<span id=\{helpId\}/);
  assert.match(s, /signOut\(\{ redirect: false \}\)/);
  const layout = src("app/admin/layout.tsx");
  // Beside Sign out in both admin places (nav and the 403 page), never instead of it.
  assert.equal((layout.match(/<SignOutButton \/>/g) ?? []).length, 2);
  assert.equal((layout.match(/<SignOutEverywhereButton endSessionUrl=\{endSessionUrl\} \/>/g) ?? []).length, 2);
});
