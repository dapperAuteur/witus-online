export interface PacketRef {
  id: string;
  episode: string;
  commodity: string;
  subject: "ELA" | "Geography" | "Social Studies" | "Economics";
  label: string;
  /** Public path to the PDF when it's shipped. */
  pdf?: string;
}

/**
 * The v1 download surface only ships one packet (Episode 1 Coffee ELA).
 * The other 7 packets BAM already has authored are tracked in
 * plans/future/multi-subject-packet-downloads.md and can be appended
 * here as their PDFs land in public/downloads/.
 */
export const PACKETS: PacketRef[] = [
  {
    id: "episode-01-coffee-ela",
    episode: "Episode 1",
    commodity: "Coffee",
    subject: "ELA",
    label: "Episode 1: Coffee (ELA)",
    pdf: "/downloads/BVC_Ep1_Coffee_ELA_Packet_ver_3.pdf",
  },
];

export function packetById(id: string | undefined): PacketRef | null {
  if (!id) return null;
  return PACKETS.find((p) => p.id === id) ?? null;
}
