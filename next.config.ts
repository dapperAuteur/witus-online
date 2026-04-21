import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
