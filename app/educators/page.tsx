import type { Metadata } from "next";
import Link from "next/link";
import PilotSignupForm from "@/components/PilotSignupForm";
import SampleDownloadCard from "@/components/SampleDownloadCard";
import { SITE_URL } from "@/lib/products";

export const metadata: Metadata = {
  title: "Educators",
  description:
    "Pilot Better Vice Club in your classroom. Download a sample teacher packet, or apply to the curriculum consultant program. Geography, Social Studies, Economics, and ELA, grades 9 to 12.",
  alternates: { canonical: `${SITE_URL}/educators` },
  openGraph: {
    title: "Educators · WitUS",
    description:
      "Pilot Better Vice Club in your classroom. Download a sample teacher packet or apply to the consultant program.",
    url: `${SITE_URL}/educators`,
    images: [
      {
        url: "/og/educators",
        width: 1200,
        height: 630,
        alt: "Pilot Better Vice Club in your classroom.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Educators · WitUS",
    description:
      "Pilot Better Vice Club in your classroom. Download a sample teacher packet or apply to the consultant program.",
    images: ["/og/educators"],
  },
};

export default async function EducatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const botError = err === "bot-check";
  const packetMissing = err === "packet-missing";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
      <p className="text-sm font-semibold tracking-widest text-teal-300 uppercase mb-3">
        Better Vice Club · For Educators
      </p>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
        Pilot Better Vice Club in your classroom.
      </h1>
      <p className="text-slate-200 text-lg sm:text-xl leading-relaxed mb-4 max-w-3xl">
        Better Vice Club is a 21-episode{" "}
        <strong className="text-white">curriculum and podcast</strong> about
        the global commodities that run everyday life. Each episode comes with
        subject-specific teacher packets aligned to Indiana Academic Standards
        (grades 9 to 12), usable in Geography, Social Studies, Economics, and
        ELA.
      </p>
      <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-3xl">
        Two ways to engage.{" "}
        <strong className="text-white">Grab a sample packet</strong> to see
        how BVC reads in a classroom.{" "}
        <strong className="text-white">Apply to the pilot</strong> to get
        every packet BAM ships in exchange for structured feedback.
      </p>

      <section
        aria-labelledby="sample-heading"
        className="mb-16 rounded-2xl border border-teal-500/30 bg-slate-900/60 p-6 sm:p-8"
      >
        <p className="text-xs font-semibold tracking-widest text-teal-300 uppercase mb-2">
          Step one
        </p>
        <h2
          id="sample-heading"
          className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight"
        >
          Try a sample packet.
        </h2>
        <p className="text-slate-300 leading-relaxed mb-6 max-w-2xl">
          The Episode 1 (Coffee) ELA packet. A complete teacher packet with
          discussion prompts, writing extensions, and subject-specific context.
          No email required. Prove you are a human and download.
        </p>
        <SampleDownloadCard botError={botError} packetMissing={packetMissing} />
      </section>

      <section
        aria-labelledby="pilot-heading"
        className="mb-16 rounded-2xl border border-fuchsia-500/30 bg-slate-900/60 p-6 sm:p-8"
      >
        <p className="text-xs font-semibold tracking-widest text-fuchsia-300 uppercase mb-2">
          Step two
        </p>
        <h2
          id="pilot-heading"
          className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight"
        >
          Apply to the pilot.
        </h2>
        <p className="text-slate-300 leading-relaxed mb-6 max-w-2xl">
          Teaching Geography, Social Studies, Economics, or ELA? BAM is
          looking for educators to pilot the curriculum and provide structured
          feedback. You get the materials for free. BAM gets the feedback that
          makes the next packet better.
        </p>
        <PilotSignupForm />
      </section>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-2">
        <Link
          href="/learn/curriculum"
          className="text-teal-300 hover:text-teal-200 underline underline-offset-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded font-semibold"
        >
          How BVC works &rarr;
        </Link>
        <Link
          href="/explore"
          className="text-teal-300 hover:text-teal-200 underline underline-offset-2 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded font-semibold"
        >
          See all 21 episodes on the map &rarr;
        </Link>
      </div>
      <p className="text-xs text-slate-400 max-w-2xl">
        Already taught with a BVC packet?{" "}
        <Link
          href="/educators/feedback"
          className="text-teal-300 hover:text-teal-200 underline underline-offset-2"
        >
          Share feedback
        </Link>{" "}
        so the next one lands harder.
      </p>
    </div>
  );
}
