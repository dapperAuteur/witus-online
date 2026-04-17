"use client";

import { useEffect, useState } from "react";

type Option = { slug: string; label: string };

const OPTIONS: Option[] = [
  { slug: "01-orbit", label: "Option 1: Orbit mark" },
  { slug: "02-duality", label: "Option 2: Duality W" },
  { slug: "03-type-dot", label: "Option 3: Type + dot" },
  { slug: "04-orbit-type", label: "Option 4: Orbit + W hybrid" },
];

export default function FaviconSwitcher() {
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!selected) return;
    const head = document.head;
    head
      .querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"], link[data-spike="favicon"]')
      .forEach((el) => el.remove());

    const svgLink = document.createElement("link");
    svgLink.rel = "icon";
    svgLink.type = "image/svg+xml";
    svgLink.href = `/brand/${selected}/favicon.svg`;
    svgLink.dataset.spike = "favicon";
    head.appendChild(svgLink);

    const pngLink = document.createElement("link");
    pngLink.rel = "icon";
    pngLink.type = "image/png";
    pngLink.sizes = "32x32";
    pngLink.href = `/brand/${selected}/favicon-32.png`;
    pngLink.dataset.spike = "favicon";
    head.appendChild(pngLink);

    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = `/brand/${selected}/favicon-180.png`;
    apple.dataset.spike = "favicon";
    head.appendChild(apple);
  }, [selected]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center p-4 rounded-xl border border-slate-800 bg-slate-900/60 mb-10">
      <label htmlFor="favicon-switch" className="text-sm text-slate-300 font-medium">
        Live favicon preview (reloads browser tab):
      </label>
      <select
        id="favicon-switch"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="min-h-11 px-3 py-2 rounded-lg bg-slate-950 text-slate-100 border border-slate-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <option value="">Keep current</option>
        {OPTIONS.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
