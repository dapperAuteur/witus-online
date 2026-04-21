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
 * v1 downloads one packet (Coffee ELA). The other 7 packets are in git
 * under /downloads/ and are enumerated below so teachers can pick any of
 * them in the feedback form's packet dropdown. The download page itself
 * stays focused on Coffee ELA until we build a full matrix picker
 * (tracked in plans/future/multi-subject-packet-downloads.md).
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
  {
    id: "episode-01-coffee-geography",
    episode: "Episode 1",
    commodity: "Coffee",
    subject: "Geography",
    label: "Episode 1: Coffee (Geography)",
    pdf: "/downloads/BVC_Ep1_Coffee_GEOGRAPHY_Packet.pdf",
  },
  {
    id: "episode-01-coffee-social-studies",
    episode: "Episode 1",
    commodity: "Coffee",
    subject: "Social Studies",
    label: "Episode 1: Coffee (Social Studies)",
    pdf: "/downloads/BVC_Ep1_Coffee_SOCIALSTUDIES_Packet.pdf",
  },
  {
    id: "episode-01-coffee-economics",
    episode: "Episode 1",
    commodity: "Coffee",
    subject: "Economics",
    label: "Episode 1: Coffee (Economics)",
    pdf: "/downloads/BVC_Ep1_Coffee_ECONOMICS_Packet.pdf",
  },
  {
    id: "episode-03-chocolate-ela",
    episode: "Episode 3",
    commodity: "Chocolate",
    subject: "ELA",
    label: "Episode 3: Chocolate (ELA)",
    pdf: "/downloads/BVC_Ep3_Chocolate_ELA_Packet.pdf",
  },
  {
    id: "episode-03-chocolate-geography",
    episode: "Episode 3",
    commodity: "Chocolate",
    subject: "Geography",
    label: "Episode 3: Chocolate (Geography)",
    pdf: "/downloads/BVC_Ep3_Chocolate_GEOGRAPHY_Packet.pdf",
  },
  {
    id: "episode-03-chocolate-social-studies",
    episode: "Episode 3",
    commodity: "Chocolate",
    subject: "Social Studies",
    label: "Episode 3: Chocolate (Social Studies)",
    pdf: "/downloads/BVC_Ep3_Chocolate_SOCIALSTUDIES_Packet.pdf",
  },
  {
    id: "episode-03-chocolate-economics",
    episode: "Episode 3",
    commodity: "Chocolate",
    subject: "Economics",
    label: "Episode 3: Chocolate (Economics)",
    pdf: "/downloads/BVC_Ep3_Chocolate_ECONOMICS_Packet.pdf",
  },
];

export function packetById(id: string | undefined): PacketRef | null {
  if (!id) return null;
  return PACKETS.find((p) => p.id === id) ?? null;
}
