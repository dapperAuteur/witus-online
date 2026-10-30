// Plain module (not "use client") so the server Header and the client HeaderMenu share one list.
export const sectionLinks = [
  { href: "/about", label: "About" },
  { href: "/learn", label: "Learn" },
  { href: "/explore", label: "Explore" },
  { href: "/roadmap", label: "Roadmap" },
] as const;
