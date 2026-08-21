import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Providers } from "@/app/providers";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import { SITE_URL } from "@/lib/products";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "WitUS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WitUS",
  },
  title: {
    default: "WitUS. Live Long. Work Free.",
    template: "%s · WitUS",
  },
  description:
    "WitUS is the ecosystem connecting longevity and independent work. Home of CentenarianOS, Work.WitUS, Tour Manager OS, Wanderlust, Fly.WitUS, FlashLearnAI, Learn.WitUS, and AwesomeWebStore.",
  icons: {
    icon: [
      { url: "/brand/04-orbit-type/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/04-orbit-type/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/04-orbit-type/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/brand/04-orbit-type/favicon-180.png",
  },
  openGraph: {
    type: "website",
    siteName: "WitUS",
    title: "WitUS. Live Long. Work Free.",
    description:
      "The ecosystem connecting longevity and independent work.",
    url: SITE_URL,
    images: [
      {
        url: "/og/home",
        width: 1200,
        height: 630,
        alt: "WitUS. Live Long. Work Free.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WitUS. Live Long. Work Free.",
    description:
      "The ecosystem connecting longevity and independent work.",
    images: ["/og/home"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased min-h-screen flex flex-col`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-950 focus:font-semibold focus:rounded-lg"
        >
          Skip to content
        </a>
        <Providers>
          <PostHogProvider
            // Read here, in a Server Component, and passed down — rather than reading
            // process.env inside the client component — so the env surface stays in one
            // place. `?? null` is meaningful: it is what puts the provider in its
            // supported keyless state instead of initialising with `undefined`.
            apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null}
            // "/ingest" is proxied to PostHog by next.config.ts so ad blockers can't
            // drop events. NEXT_PUBLIC_POSTHOG_HOST stays the source of truth for the
            // real upstream host and is used by the rewrite, not by the browser.
            apiHost="/ingest"
          />
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
