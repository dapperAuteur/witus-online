"use client";

/**
 * MapTabs.tsx
 *
 * Tab wrapper around the two BVC map views:
 *   Tab 1 — Episode Origins (CommodityMap, pin-based, Natural Earth)
 *   Tab 2 — Growing Belts (CommodityBeltMap, latitude bands, Equal Earth)
 *
 * Both maps stay mounted; switching tabs toggles visibility only. This keeps
 * per-map state (season filter, belt toggles) and avoids re-fetching the
 * shared world-atlas topology. Dark-theme tab bar with WitUS teal underline.
 */

import { useState, type FC } from "react";
import dynamic from "next/dynamic";

const CommodityMap = dynamic(() => import("@/components/CommodityMap"), {
  ssr: false,
  loading: () => <MapLoader />,
});

const CommodityBeltMap = dynamic(
  () => import("@/components/CommodityBeltMap"),
  { ssr: false, loading: () => <MapLoader /> }
);

function MapLoader() {
  return (
    <div
      role="status"
      aria-label="Loading episode map"
      className="h-[460px] rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-center text-sm text-slate-400"
    >
      Loading map data...
    </div>
  );
}

type TabId = "origins" | "belts";

const TABS: Array<{ id: TabId; label: string; sublabel: string }> = [
  {
    id: "origins",
    label: "Episode Origins",
    sublabel: "Where each commodity comes from",
  },
  {
    id: "belts",
    label: "Growing Belts",
    sublabel: "Where each commodity can grow",
  },
];

const TEAL = "#2dd4bf";

const MapTabs: FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("origins");

  return (
    <div
      style={{
        width: "100%",
        fontFamily: "var(--font-geist-sans, Arial, Helvetica, sans-serif)",
      }}
    >
      <div
        role="tablist"
        aria-label="Commodity map views"
        style={{
          display: "flex",
          gap: 0,
          marginBottom: "24px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "14px 20px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                borderBottom: isActive
                  ? `2px solid ${TEAL}`
                  : "2px solid transparent",
                marginBottom: "-1px",
                transition: "border-color 0.15s, background 0.15s",
                minHeight: 44,
                color: "inherit",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? "#f8fafc" : "#e2e8f0",
                  marginBottom: "3px",
                  transition: "color 0.15s",
                }}
              >
                {tab.label}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: isActive ? "#cbd5e1" : "#94a3b8",
                  transition: "color 0.15s",
                }}
              >
                {tab.sublabel}
              </div>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-label="Episode origins"
        hidden={activeTab !== "origins"}
        style={{ display: activeTab === "origins" ? "block" : "none" }}
      >
        <CommodityMap />
      </div>
      <div
        role="tabpanel"
        aria-label="Growing belts"
        hidden={activeTab !== "belts"}
        style={{ display: activeTab === "belts" ? "block" : "none" }}
      >
        <CommodityBeltMap />
      </div>
    </div>
  );
};

export default MapTabs;
