/* WitUS service worker
 * Strategy:
 *   - Shell + static assets  -> cache-first
 *   - HTML documents         -> network-first, 3s timeout, then cache, then /offline
 *   - Sitemap / robots / API -> network only (bypass cache)
 */

const VERSION = "v1";
const SHELL_CACHE = `witus-shell-${VERSION}`;
const RUNTIME_CACHE = `witus-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/brand/04-orbit-type/favicon.svg",
  "/brand/04-orbit-type/favicon-16.png",
  "/brand/04-orbit-type/favicon-32.png",
  "/brand/04-orbit-type/favicon-180.png",
  "/brand/04-orbit-type/wordmark.svg",
  "/og/home.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isBypass(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname === "/sitemap.xml" ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/og/") ||
    /\.(svg|png|jpg|jpeg|gif|webp|woff2?|ico|css|js)$/.test(url.pathname)
  );
}

async function networkFirstHtml(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await caches.open(SHELL_CACHE);
    const offline = await shell.match("/offline");
    if (offline) return offline;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline asset", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isBypass(url)) return;

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
  }
});
