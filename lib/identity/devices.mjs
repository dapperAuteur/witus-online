// "Your devices" on accounts.witus.online (BAM, 2026-10-29): see which devices are signed in to
// WitUS, with enough detail to recognize them, and end the ones that aren't yours.
//
// Plain JS (allowJs) with no imports so `npm test` (node --test over scripts/lib/*.test.mjs) can
// exercise it without a TypeScript loader. The server side lives in lib/identity/devices.ts and
// app/accounts/devices/.

/**
 * @typedef {{ browser: string, os: string, deviceType: "mobile" | "tablet" | "desktop" | "unknown" }} ParsedUserAgent
 */

/** @param {string} ua @param {RegExp} re */
function version(ua, re) {
  const m = ua.match(re);
  return m && m[1] ? m[1].split(/[._]/)[0] : "";
}

/** @param {string} name @param {string} v */
function withVersion(name, v) {
  return v ? `${name} ${v}` : name;
}

/**
 * Browser, OS and device type from a User-Agent string. Deliberately small: it names the common
 * browsers and systems well enough for a person to recognize their own device, and says
 * "Unknown" rather than guessing when it can't. Order matters: Edge, Opera and Samsung Internet
 * all also claim "Chrome", and every Chromium browser also claims "Safari".
 *
 * @param {string | null | undefined} userAgent
 * @returns {ParsedUserAgent}
 */
export function parseUserAgent(userAgent) {
  const ua = (userAgent ?? "").trim();
  if (!ua) return { browser: "Unknown browser", os: "Unknown system", deviceType: "unknown" };

  let browser = "Unknown browser";
  if (/EdgiOS\//.test(ua)) browser = withVersion("Edge", version(ua, /EdgiOS\/([\d.]+)/));
  else if (/EdgA?\//.test(ua)) browser = withVersion("Edge", version(ua, /EdgA?\/([\d.]+)/));
  else if (/OPR\/|OPiOS\//.test(ua)) browser = withVersion("Opera", version(ua, /(?:OPR|OPiOS)\/([\d.]+)/));
  else if (/SamsungBrowser\//.test(ua))
    browser = withVersion("Samsung Internet", version(ua, /SamsungBrowser\/([\d.]+)/));
  else if (/FxiOS\//.test(ua)) browser = withVersion("Firefox", version(ua, /FxiOS\/([\d.]+)/));
  else if (/Firefox\//.test(ua)) browser = withVersion("Firefox", version(ua, /Firefox\/([\d.]+)/));
  else if (/CriOS\//.test(ua)) browser = withVersion("Chrome", version(ua, /CriOS\/([\d.]+)/));
  else if (/Chrome\//.test(ua)) browser = withVersion("Chrome", version(ua, /Chrome\/([\d.]+)/));
  else if (/Safari\//.test(ua) && /Version\//.test(ua))
    browser = withVersion("Safari", version(ua, /Version\/([\d.]+)/));
  else if (/^curl\//i.test(ua)) browser = "curl";

  let os = "Unknown system";
  let deviceType = /** @type {ParsedUserAgent["deviceType"]} */ ("unknown");
  if (/iPad/.test(ua)) {
    os = withVersion("iPadOS", version(ua, /OS (\d+)[_.]/));
    deviceType = "tablet";
  } else if (/iPhone|iPod/.test(ua)) {
    os = withVersion("iOS", version(ua, /OS (\d+)[_.]/));
    deviceType = "mobile";
  } else if (/Android/.test(ua)) {
    os = withVersion("Android", version(ua, /Android ([\d.]+)/));
    deviceType = /Mobile/.test(ua) ? "mobile" : "tablet";
  } else if (/CrOS/.test(ua)) {
    os = "ChromeOS";
    deviceType = "desktop";
  } else if (/Windows NT/.test(ua)) {
    // Windows 11 still reports "Windows NT 10.0", so 10 and 11 can't be told apart here.
    os = /Windows NT 10\.0/.test(ua) ? "Windows 10 or 11" : "Windows";
    deviceType = "desktop";
  } else if (/Mac OS X|Macintosh/.test(ua)) {
    // macOS froze the version in the User-Agent at 10.15.7, so naming one would mislead.
    os = "macOS";
    deviceType = "desktop";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
    deviceType = "desktop";
  }

  return { browser, os, deviceType };
}

/** @param {string | null | undefined} raw */
function cleanHeader(raw) {
  if (raw == null) return null;
  let value = String(raw).trim();
  if (!value) return null;
  try {
    // Vercel URL-encodes the city ("S%C3%A3o%20Paulo"). A malformed escape keeps the raw value.
    value = decodeURIComponent(value);
  } catch {
    // keep the undecoded value
  }
  value = value.trim();
  // Bound what lands in the database; these are short place names.
  return value ? value.slice(0, 100) : null;
}

/**
 * Approximate location from Vercel's request geo headers. Every field is optional: Vercel omits
 * them for requests it can't place (and they never exist in local dev), so null means "unknown",
 * never an error.
 *
 *   x-vercel-ip-city            URL-encoded city name
 *   x-vercel-ip-country-region  ISO 3166-2 region code (e.g. "IN")
 *   x-vercel-ip-country         ISO 3166-1 alpha-2 country code (e.g. "US")
 *
 * @param {(name: string) => string | null | undefined} getHeader e.g. `(n) => headers.get(n)`
 * @returns {{ city: string | null, region: string | null, country: string | null }}
 */
export function geoFromHeaders(getHeader) {
  return {
    city: cleanHeader(getHeader("x-vercel-ip-city")),
    region: cleanHeader(getHeader("x-vercel-ip-country-region")),
    country: cleanHeader(getHeader("x-vercel-ip-country")),
  };
}

export const LOCATION_NOT_RECORDED = "Location not recorded (signed in before this was added)";
export const LOCATION_UNKNOWN = "Location unknown";

/**
 * The values the session-create hook stores. Unknown fields become "" rather than null, the same
 * convention better-auth uses for ipAddress and userAgent when a request has no headers. That
 * keeps two cases apart without guessing a ship date: null in all three columns means the row
 * predates location recording; "" means we looked and the host could not place the IP.
 *
 * @param {{ city: string | null, region: string | null, country: string | null }} geo
 * @returns {{ city: string, region: string, country: string }}
 */
export function geoForStorage(geo) {
  return { city: geo.city ?? "", region: geo.region ?? "", country: geo.country ?? "" };
}

/**
 * One line for the page. See geoForStorage for why null and "" mean different things.
 *
 * @param {{ city?: string | null, region?: string | null, country?: string | null }} row
 * @returns {string}
 */
export function describeLocation(row) {
  const fields = [row.city, row.region, row.country];
  if (fields.every((f) => f == null)) return LOCATION_NOT_RECORDED;
  const parts = fields.filter((f) => typeof f === "string" && f.trim());
  return parts.length ? parts.join(", ") : LOCATION_UNKNOWN;
}

/**
 * The session row with this id, but only if it belongs to `userId`. Every action that ends a
 * session by id goes through this, so a forged id for someone else's session matches nothing.
 *
 * @template {{ id: string, userId: string }} T
 * @param {readonly T[]} rows
 * @param {string} sessionId
 * @param {string} userId
 * @returns {T | null}
 */
export function findOwnedSession(rows, sessionId, userId) {
  if (!sessionId || !userId) return null;
  return rows.find((r) => r.id === sessionId && r.userId === userId) ?? null;
}

/**
 * Same-origin path to return to after a direct (non-OAuth) sign-in on accounts.witus.online.
 * Only paths under /accounts/ are allowed, so `?next=` can't be used as an open redirect.
 *
 * @param {string | null | undefined} next
 * @returns {string | null}
 */
export function safeAccountsNext(next) {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/accounts/") || next.startsWith("//") || next.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(next)) return null;
  return next;
}
