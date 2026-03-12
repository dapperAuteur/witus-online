import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WitUS — Live Long. Work Free.",
  description:
    "WitUS is the platform connecting longevity and independent work. Home of CentenarianOS and Work.WitUS.",
  openGraph: {
    title: "WitUS — Live Long. Work Free.",
    description:
      "The platform connecting longevity and independent work. Home of CentenarianOS and Work.WitUS.",
    url: "https://witus.online",
    siteName: "WitUS",
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
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
