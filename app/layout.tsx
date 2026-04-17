import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
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
    "WitUS is the ecosystem connecting longevity and independent work. Home of CentenarianOS, Work.WitUS, Tour Manager OS, Wanderlearn, Fly.WitUS, FlashLearnAI, Learn.WitUS, and AwesomeWebStore.",
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
        url: "/og/home.png",
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
    images: ["/og/home.png"],
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
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
