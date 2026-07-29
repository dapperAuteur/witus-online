import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog's endpoints use trailing slashes (/e/, /flags/, /s/). Without this, Next
  // issues a 308 to the slashless form before the rewrite runs and ingest breaks.
  // Required by PostHog's documented Next.js proxy setup.
  //
  // SIDE EFFECT worth knowing: this disables Next's automatic trailing-slash redirect
  // for EVERY route, not just /ingest. So /about/ no longer 308s to /about and both
  // forms become reachable. The per-page `alternates.canonical` metadata (built from
  // SITE_URL) is what keeps search engines pointed at one form — verify those survive
  // any future metadata refactor. See plans/26.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    // Reverse-proxy PostHog through our own origin. us.i.posthog.com is on uBlock
    // Origin, Brave Shields, and Safari's tracker list, so a meaningful share of
    // events never leave the browser — including, reliably, our own test visits.
    // Routing ingest through witus.online leaves blockers nothing to match on.
    //
    // Assets come from a different upstream host than ingest, hence two rules. The
    // more specific /static rule must come first.
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        // Force every file under /downloads/ to trigger a real download
        // instead of rendering the PDF inline in the browser. Without this,
        // the server-action redirect from the Turnstile-gated download
        // button would just replace the /educators page with an inline PDF.
        source: "/downloads/:path*",
        headers: [
          {
            key: "Content-Disposition",
            value: "attachment",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
