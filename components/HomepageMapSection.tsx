"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const MapTabs = dynamic(() => import("@/components/MapTabs"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

function MapPlaceholder({
  hint = "Loading episode map...",
}: {
  hint?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading episode map"
      className="h-[460px] rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-center text-sm text-slate-400"
    >
      {hint}
    </div>
  );
}

/**
 * Defers the D3 + topojson-client bundle download until the map section
 * is near the viewport. Keeps the homepage perf budget intact. On /explore
 * the map is above the fold, so the observer fires immediately anyway.
 */
export default function HomepageMapSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={ref}>
      {shouldLoad ? <MapTabs /> : <MapPlaceholder />}
    </div>
  );
}
