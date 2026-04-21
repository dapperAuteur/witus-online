import type { Metadata } from "next";
import Link from "next/link";
import FeedbackForm from "@/components/FeedbackForm";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "Teacher feedback",
  description:
    "Post-use feedback on a Better Vice Club teacher packet. Two minutes makes the next packet better.",
  alternates: { canonical: `${SITE_URL}/educators/feedback` },
  openGraph: {
    title: "Teacher feedback · WitUS",
    description:
      "Post-use feedback on a Better Vice Club teacher packet. Two minutes makes the next packet better.",
    url: `${SITE_URL}/educators/feedback`,
    images: [
      {
        url: "/og/educators-feedback",
        width: 1200,
        height: 630,
        alt: "You taught with a BVC packet. How did it go?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Teacher feedback · WitUS",
    description:
      "Post-use feedback on a Better Vice Club teacher packet.",
    images: ["/og/educators-feedback"],
  },
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ packet?: string }>;
}) {
  const { packet } = await searchParams;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      <Link
        href="/educators"
        className="inline-block text-sm text-slate-400 hover:text-white transition-colors mb-6 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
      >
        &larr; Back to Educators
      </Link>

      <p className="text-sm font-semibold tracking-widest text-teal-300 uppercase mb-3">
        Better Vice Club · Feedback
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 leading-tight">
        You taught with a BVC packet. How did it go?
      </h1>
      <p className="text-slate-200 text-base sm:text-lg leading-relaxed mb-10 max-w-2xl">
        Two minutes of feedback makes the next packet better. Specific details
        beat scores. If the QR code brought you here the packet is prefilled;
        change it if you used a different one.
      </p>

      <FeedbackForm initialPacket={packet} />
    </div>
  );
}
