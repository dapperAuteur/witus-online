"use client";

/**
 * CommodityMap.tsx
 *
 * Interactive world map showing all 21 BVC episodes by geographic origin.
 * Ported from plans/maps/bvc-map-component/ with a dark theme to match
 * WitUS.online's chrome. Season colors are intentionally unchanged (they
 * are semantic BVC brand identity, not chrome).
 *
 * Source: plans/maps/BVC_Map_Instructions_WitUS.md (plan 10).
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FC,
} from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { COMMODITIES, getColor } from "@/data/commodities";
import type { Commodity, Season } from "@/types/commodity";

type FilterState = "all" | Season;

interface PanelState {
  commodity: Commodity;
  color: string;
}

interface CountryFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown[];
  };
}

function SeasonButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderRadius: "8px",
        border: active ? `1.5px solid ${color}` : "1px solid #334155",
        background: active ? `${color}2a` : "transparent",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: active ? 600 : 500,
        color: active ? "#f1f5f9" : "#cbd5e1",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        minHeight: 40,
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );
}

function InfoPanel({ panel }: { panel: PanelState | null }) {
  if (!panel) {
    return (
      <div
        style={{
          marginTop: "12px",
          padding: "14px 16px",
          borderRadius: "10px",
          border: "0.5px solid #334155",
          minHeight: "72px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "#0f172a",
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#475569",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>
          Click any pin to see episode details.
        </span>
      </div>
    );
  }

  const { commodity: c, color } = panel;

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "14px 16px",
        borderRadius: "10px",
        border: `0.5px solid ${color}66`,
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        background: "#0f172a",
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          marginTop: "4px",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          Season {c.season} &nbsp;·&nbsp; {c.ep}
        </div>
        <div
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#f8fafc",
            marginBottom: "4px",
          }}
        >
          {c.name}
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "#cbd5e1",
            marginBottom: "6px",
          }}
        >
          {c.geo}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "#cbd5e1",
            lineHeight: "1.6",
          }}
        >
          {c.body}
        </div>
      </div>
    </div>
  );
}

const SEASON_FILTERS: { value: FilterState; label: string; color: string }[] =
  [
    { value: "all", label: "All 21 episodes", color: "#94a3b8" },
    { value: 1, label: "Season 1: Daily Rituals", color: "#BA7517" },
    { value: 2, label: "Season 2: The Oldest Toast", color: "#185FA5" },
    { value: 3, label: "Season 3: The Forbidden Leaf", color: "#993C1D" },
  ];

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const CommodityMap: FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [filter, setFilter] = useState<FilterState>("all");
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [topoData, setTopoData] = useState<Topology | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(WORLD_ATLAS_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load map data (${r.status})`);
        return r.json() as Promise<Topology>;
      })
      .then(setTopoData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !topoData) return;

    const W = 900;
    const H = 460;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const proj = d3
      .geoNaturalEarth1()
      .scale(148)
      .translate([W / 2, H / 2]);

    const pathGen = d3.geoPath(proj);

    svg
      .append("path")
      .datum({ type: "Sphere" } as d3.GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "#0f172a");

    svg
      .append("path")
      .datum(d3.geoGraticule()() as d3.GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("stroke", "#334155")
      .attr("stroke-width", 0.3);

    const countries = topojson.feature(
      topoData,
      topoData.objects["countries"] as GeometryCollection<CountryFeature>
    );

    svg
      .append("g")
      .selectAll<SVGPathElement, unknown>("path")
      .data((countries as d3.ExtendedFeatureCollection).features)
      .join("path")
      .attr("d", pathGen)
      .attr("fill", "#1e293b")
      .attr("stroke", "#020617")
      .attr("stroke-width", 0.4);

    const visible =
      filter === "all"
        ? COMMODITIES
        : COMMODITIES.filter((c) => c.season === filter || c.isHome);

    const pinGroup = svg.append("g");

    visible.forEach((c) => {
      const coords = proj([c.lon, c.lat]);
      if (!coords) return;
      const [px, py] = coords;

      const color = getColor(c);
      const r = c.isHome ? 6 : 5;

      pinGroup
        .append("circle")
        .attr("cx", px)
        .attr("cy", py)
        .attr("r", c.isHome ? 11 : 9)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.45);

      pinGroup
        .append("circle")
        .attr("cx", px)
        .attr("cy", py)
        .attr("r", r)
        .attr("fill", color)
        .attr("stroke", "#020617")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseenter", function () {
          d3.select(this).attr("r", r + 2);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("r", r);
        })
        .on("click", () => {
          setPanel({ commodity: c, color });
        });

      pinGroup
        .append("text")
        .attr("x", px)
        .attr("y", py - (c.isHome ? 13 : 11))
        .attr("text-anchor", "middle")
        .attr("font-size", "7px")
        .attr("font-weight", "600")
        .attr("fill", color)
        .attr("pointer-events", "none")
        .text(c.isHome ? "Home" : `Ep ${c.id}`);
    });
  }, [topoData, filter]);

  const handleFilter = useCallback(
    (value: FilterState) => {
      setFilter(value);
      if (panel && value !== "all") {
        const season = value as Season;
        if (panel.commodity.season !== season && !panel.commodity.isHome) {
          setPanel(null);
        }
      }
    },
    [panel]
  );

  return (
    <div
      style={{
        width: "100%",
        fontFamily:
          "var(--font-geist-sans, Arial, Helvetica, sans-serif)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {SEASON_FILTERS.map((f) => (
          <SeasonButton
            key={String(f.value)}
            label={f.label}
            color={f.color}
            active={filter === f.value}
            onClick={() => handleFilter(f.value)}
          />
        ))}
      </div>

      <p
        style={{
          fontSize: "14px",
          color: "#cbd5e1",
          marginBottom: "10px",
        }}
      >
        {COMMODITIES.length} commodities across 3 seasons. Click any pin for
        details.
      </p>

      <div
        style={{
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          border: "0.5px solid #1e293b",
          background: "#020617",
        }}
      >
        {error ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "#f87171",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        ) : !topoData ? (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Loading map data...
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox="0 0 900 460"
            style={{ width: "100%", display: "block" }}
            role="img"
            aria-label="World map showing 21 BVC commodities by geographic origin, color-coded by season"
          />
        )}
      </div>

      <InfoPanel panel={panel} />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "0.5px solid #1e293b",
        }}
      >
        {[
          { color: "#BA7517", label: "Season 1: Daily Rituals (Eps 1–7)" },
          { color: "#185FA5", label: "Season 2: The Oldest Toast (Eps 8–14)" },
          { color: "#993C1D", label: "Season 3: The Forbidden Leaf (Eps 15–21)" },
          { color: "#3B6D11", label: "Home base — Indianapolis" },
        ].map((item) => (
          <div
            key={item.color}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "#e2e8f0",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: item.color,
                flexShrink: 0,
              }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommodityMap;
