// "Your devices" on accounts.witus.online (BAM, 2026-10-29): user-agent parsing, Vercel geo
// header parsing, the location line, the owner check, and the ?next= allowlist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LOCATION_NOT_RECORDED,
  LOCATION_UNKNOWN,
  describeLocation,
  findOwnedSession,
  geoForStorage,
  geoFromHeaders,
  parseUserAgent,
  safeAccountsNext,
} from "../../lib/identity/devices.mjs";

const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const UA = {
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  safariIpad:
    "Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68",
  firefoxWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  samsungTablet:
    "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Safari/537.36",
  operaWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0",
  chromebook:
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

test("parseUserAgent names common browsers and systems", () => {
  const cases = [
    [UA.chromeMac, "Chrome 130", "macOS", "desktop"],
    [UA.safariMac, "Safari 17", "macOS", "desktop"],
    [UA.safariIphone, "Safari 17", "iOS 17", "mobile"],
    [UA.chromeIphone, "Chrome 130", "iOS 17", "mobile"],
    [UA.safariIpad, "Safari 16", "iPadOS 16", "tablet"],
    [UA.edgeWindows, "Edge 130", "Windows 10 or 11", "desktop"],
    [UA.firefoxWindows, "Firefox 131", "Windows 10 or 11", "desktop"],
    [UA.firefoxLinux, "Firefox 131", "Linux", "desktop"],
    [UA.chromeAndroid, "Chrome 130", "Android 14", "mobile"],
    [UA.samsungTablet, "Samsung Internet 25", "Android 13", "tablet"],
    [UA.operaWindows, "Opera 114", "Windows 10 or 11", "desktop"],
    [UA.chromebook, "Chrome 130", "ChromeOS", "desktop"],
  ];
  for (const [ua, browser, os, deviceType] of cases) {
    assert.deepEqual(parseUserAgent(ua), { browser, os, deviceType }, ua);
  }
});

test("parseUserAgent says unknown instead of guessing", () => {
  const unknown = { browser: "Unknown browser", os: "Unknown system", deviceType: "unknown" };
  assert.deepEqual(parseUserAgent(""), unknown);
  assert.deepEqual(parseUserAgent(null), unknown);
  assert.deepEqual(parseUserAgent(undefined), unknown);
  assert.deepEqual(parseUserAgent("   "), unknown);
  assert.deepEqual(parseUserAgent("SomeBot/1.0"), { ...unknown });
  assert.equal(parseUserAgent("curl/8.4.0").browser, "curl");
});

const headerGetter = (obj) => (name) => obj[name];

test("geoFromHeaders URL-decodes the city and reads region and country", () => {
  assert.deepEqual(
    geoFromHeaders(
      headerGetter({
        "x-vercel-ip-city": "S%C3%A3o%20Paulo",
        "x-vercel-ip-country-region": "SP",
        "x-vercel-ip-country": "BR",
      }),
    ),
    { city: "São Paulo", region: "SP", country: "BR" },
  );
  assert.equal(geoFromHeaders(headerGetter({ "x-vercel-ip-city": "Indianapolis" })).city, "Indianapolis");
});

test("geoFromHeaders treats missing, empty and malformed headers safely", () => {
  assert.deepEqual(geoFromHeaders(headerGetter({})), { city: null, region: null, country: null });
  assert.deepEqual(
    geoFromHeaders(headerGetter({ "x-vercel-ip-city": "", "x-vercel-ip-country": "  " })),
    { city: null, region: null, country: null },
  );
  // A broken escape keeps the raw value rather than throwing during sign-in.
  assert.equal(geoFromHeaders(headerGetter({ "x-vercel-ip-city": "Bad%E0%A4%A" })).city, "Bad%E0%A4%A");
  // Works with a real Headers object (what the better-auth hook passes).
  const h = new Headers({ "x-vercel-ip-city": "New%20York", "x-vercel-ip-country": "US" });
  assert.deepEqual(geoFromHeaders((n) => h.get(n)), { city: "New York", region: null, country: "US" });
  // Bounded length.
  assert.equal(geoFromHeaders(headerGetter({ "x-vercel-ip-city": "x".repeat(500) })).city.length, 100);
});

test("geoForStorage stores unknown as empty string so NULL keeps meaning 'before this shipped'", () => {
  assert.deepEqual(geoForStorage({ city: null, region: "IN", country: "US" }), {
    city: "",
    region: "IN",
    country: "US",
  });
});

test("describeLocation separates 'not recorded' from 'unknown'", () => {
  assert.equal(describeLocation({ city: null, region: null, country: null }), LOCATION_NOT_RECORDED);
  assert.equal(describeLocation({}), LOCATION_NOT_RECORDED);
  assert.equal(describeLocation({ city: "", region: "", country: "" }), LOCATION_UNKNOWN);
  assert.equal(describeLocation({ city: "Indianapolis", region: "IN", country: "US" }), "Indianapolis, IN, US");
  assert.equal(describeLocation({ city: "", region: "", country: "US" }), "US");
  assert.equal(LOCATION_NOT_RECORDED, "Location not recorded (signed in before this was added)");
});

test("findOwnedSession only returns the current user's row", () => {
  const rows = [
    { id: "s1", userId: "alice", token: "t1" },
    { id: "s2", userId: "bob", token: "t2" },
  ];
  assert.equal(findOwnedSession(rows, "s1", "alice")?.token, "t1");
  assert.equal(findOwnedSession(rows, "s2", "alice"), null, "another user's session id");
  assert.equal(findOwnedSession(rows, "nope", "alice"), null);
  assert.equal(findOwnedSession(rows, "", "alice"), null);
  assert.equal(findOwnedSession(rows, "s1", ""), null);
  assert.equal(findOwnedSession([], "s1", "alice"), null);
});

test("safeAccountsNext allows only /accounts/ paths", () => {
  assert.equal(safeAccountsNext("/accounts/devices"), "/accounts/devices");
  for (const bad of [
    null,
    undefined,
    "",
    "/",
    "/admin",
    "https://evil.example/accounts/devices",
    "//evil.example/accounts/",
    "/accounts\\..\\x",
    "/accounts/devices\n",
  ]) {
    assert.equal(safeAccountsNext(bad), null, String(bad));
  }
});

test("wiring: hook, owner check, token never sent to the page", () => {
  const authTs = src("lib/identity/auth.ts");
  assert.match(authTs, /databaseHooks:\s*{\s*session:\s*{\s*create:\s*{\s*\/\/[\s\S]*?before:/);
  assert.match(authTs, /city: { type: "string", required: false, input: false }/);
  const data = src("lib/identity/device-sessions.ts");
  assert.match(data, /findOwnedSession\(rows, sessionId, userId\)/);
  // listDevices selects explicit columns; the token column must not be among them.
  const listDevices = data.slice(data.indexOf("export async function listDevices"), data.indexOf("export async function ownedSessionToken"));
  assert.doesNotMatch(listDevices, /session\.token/);
  const actions = src("app/accounts/devices/actions.ts");
  assert.match(actions, /ownedSessionToken\(current\.userId, sessionId\)/);
  assert.match(actions, /auth\.api\.revokeSession\(/);
  assert.match(actions, /auth\.api\.revokeOtherSessions\(/);
});
