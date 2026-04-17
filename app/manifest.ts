import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WitUS",
    short_name: "WitUS",
    description: "WitUS. Live Long. Work Free.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait",
    icons: [
      {
        src: "/brand/04-orbit-type/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/04-orbit-type/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/brand/04-orbit-type/favicon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
