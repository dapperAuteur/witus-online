"use client";

/**
 * CommodityBeltMap.tsx
 *
 * Growing-belt map for BVC. Equal Earth projection + mix-blend-mode: multiply
 * for paint-like color mixing where belts overlap. Ported from
 * plans/maps/BVC Map ver 02/bvc-map-component/components/CommodityBeltMap.tsx.
 *
 * IMPORTANT: the SVG INTERIOR must stay light-backed. Multiply blend mode
 * only produces the intended overlap colors against a light ocean; on a dark
 * page this looks wrong. Surrounding chrome (tab bar, filter buttons, info
 * panel, legends) is ported to WitUS dark theme; only the map panel itself
 * stays light.
 */

import { useEffect, useRef, useState, useCallback, type FC } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

export interface Belt {
  id: string;
  name: string;
  episode: string;
  season: number;
  color: string;
  latMin: number;
  latMax: number;
  description: string;
  producers: string;
  modeB: boolean;
}

export const BELTS: Belt[] = [
  {
    id: "coffee",
    name: "Coffee",
    episode: "Episode 1",
    season: 1,
    color: "#FFE500",
    latMin: -30,
    latMax: 25,
    description:
      "The Bean Belt spans 25°N to 30°S and requires volcanic soil, high elevation, and consistent rainfall. No frost tolerance.",
    producers: "Brazil (38%), Vietnam (18%), Colombia (8%), Ethiopia (4%)",
    modeB: true,
  },
  {
    id: "cacao",
    name: "Chocolate (Cacao)",
    episode: "Episode 3",
    season: 1,
    color: "#FF2200",
    latMin: -20,
    latMax: 20,
    description:
      "The Cacao Belt is narrower than coffee. 20°N to 20°S. Requires rainforest canopy shade, 70-100% humidity, and temperatures above 60°F year-round.",
    producers: "Côte d'Ivoire (42%), Ghana (17%), Indonesia (13%), Nigeria (7%)",
    modeB: true,
  },
  {
    id: "tea",
    name: "Tea",
    episode: "Episode 2",
    season: 1,
    color: "#0055FF",
    latMin: -35,
    latMax: 35,
    description:
      "Tea grows across a wide band from 35°N to 35°S, but quality production concentrates in highland tropical zones where altitude creates flavor complexity.",
    producers: "China (46%), India (23%), Kenya (8%), Sri Lanka (6%)",
    modeB: true,
  },
  {
    id: "sugar",
    name: "Sugar",
    episode: "Episode 4",
    season: 1,
    color: "#FF8800",
    latMin: -35,
    latMax: 35,
    description:
      "Sugarcane grows across tropical and subtropical zones. The colonial sugar belt of the Caribbean and Brazil was the economic foundation of the Atlantic slave trade.",
    producers: "Brazil (39%), India (20%), China (6%), Thailand (5%)",
    modeB: false,
  },
  {
    id: "guayusa",
    name: "Guayusa",
    episode: "Episode 5",
    season: 1,
    color: "#00EE88",
    latMin: -5,
    latMax: 5,
    description:
      "Guayusa grows only in the Amazonian equatorial zone. The narrowest belt in the series. Requires dense canopy shade and year-round tropical conditions.",
    producers: "Ecuador (primary), Peru, Colombia",
    modeB: false,
  },
  {
    id: "kola",
    name: "Kola Nut",
    episode: "Episode 6",
    season: 1,
    color: "#FFAA00",
    latMin: 0,
    latMax: 15,
    description:
      "Kola nut grows in tropical West Africa between the equator and 15°N. It thrives in the same rainforest conditions as cacao. The two belts overlap significantly.",
    producers: "Nigeria (primary), Ghana, Côte d'Ivoire, Sierra Leone",
    modeB: false,
  },
  {
    id: "tobacco",
    name: "Tobacco",
    episode: "Episode 15",
    season: 3,
    color: "#00BB44",
    latMin: -40,
    latMax: 60,
    description:
      "Tobacco has the broadest growing belt (60°N to 40°S), which is part of what made it the first successful global colonial commodity. It grows almost anywhere temperate.",
    producers: "China (43%), Brazil (11%), India (9%), USA (5%)",
    modeB: false,
  },
  {
    id: "cannabis",
    name: "Cannabis",
    episode: "Episode 16",
    season: 3,
    color: "#00CCEE",
    latMin: -50,
    latMax: 50,
    description:
      "Cannabis has one of the widest natural growing ranges in the series (50°N to 50°S). Its near-global range is part of why its Schedule I classification was driven by politics, not pharmacology.",
    producers: "Afghanistan, Morocco, Mexico, Colombia, USA (legal states)",
    modeB: false,
  },
  {
    id: "coca",
    name: "Coca",
    episode: "Episode 18",
    season: 3,
    color: "#EE0099",
    latMin: -20,
    latMax: 15,
    description:
      "Coca grows in Andean highland tropical zones. Concentrated but not identical to the Cacao Belt. Requires elevations of 500-2,000m, humid conditions, and well-drained volcanic soil.",
    producers: "Colombia (primary), Peru, Bolivia",
    modeB: false,
  },
  {
    id: "khat",
    name: "Khat",
    episode: "Episode 20",
    season: 3,
    color: "#AAEE00",
    latMin: -15,
    latMax: 15,
    description:
      "Khat grows in tropical highland conditions (elevations of 1,500-2,500m, temperatures of 15-25°C). Its belt overlaps with coffee, cacao, and tea in the East African highlands.",
    producers: "Ethiopia (primary), Kenya (miraa), Yemen",
    modeB: false,
  },
  {
    id: "poppy",
    name: "Opium Poppy",
    episode: "Episode 17",
    season: 3,
    color: "#8800EE",
    latMin: 20,
    latMax: 55,
    description:
      "The opium poppy belt runs through temperate regions from 25°N to 55°N. It's the only major BVC belt in the northern temperate zone. Produces where coffee, cacao, and tea cannot grow.",
    producers: "Afghanistan (85% of illicit supply), Myanmar, Mexico",
    modeB: false,
  },
  {
    id: "peyote",
    name: "Peyote",
    episode: "Episode 19",
    season: 3,
    color: "#FF5544",
    latMin: 22,
    latMax: 32,
    description:
      "Peyote's range is the most geographically specific in the series. The Chihuahuan Desert of Texas and northern Mexico, a narrow band from 22°N to 32°N between 95°W and 105°W.",
    producers:
      "Texas (USA), Tamaulipas, Coahuila (Mexico). Endangered; 10-15 years to maturity",
    modeB: false,
  },
];

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type ViewMode = "bands" | "regions";

interface CountryFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown[] };
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function multiplyBlend(colors: string[]): string {
  if (colors.length === 0) return "#ffffff";
  const rgbs = colors.map(hexToRgb);
  const blended = rgbs.reduce(
    (acc, c) => ({
      r: Math.round((acc.r * c.r) / 255),
      g: Math.round((acc.g * c.g) / 255),
      b: Math.round((acc.b * c.b) / 255),
    }),
    { r: 255, g: 255, b: 255 }
  );
  return `rgb(${blended.r},${blended.g},${blended.b})`;
}

const OVERLAP_SAMPLES: Array<{ count: number; colors: string[]; label: string }> = [
  { count: 1, colors: ["#FFE500"], label: "1 belt" },
  { count: 2, colors: ["#FFE500", "#FF2200"], label: "2 belts" },
  { count: 3, colors: ["#FFE500", "#FF2200", "#0055FF"], label: "3 belts" },
  {
    count: 4,
    colors: ["#FFE500", "#FF2200", "#0055FF", "#00BB44"],
    label: "4+ belts",
  },
];

function BeltToggleButton({
  belt,
  active,
  onClick,
}: {
  belt: Belt;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={belt.description}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "6px",
        border: active ? `1.5px solid ${belt.color}` : "1px solid #334155",
        background: active ? `${belt.color}20` : "transparent",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: active ? 600 : 500,
        color: active ? "#f1f5f9" : "#cbd5e1",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        minHeight: 36,
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: active ? belt.color : "#475569",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
      />
      {belt.name}
    </button>
  );
}

function OverlapLegend() {
  return (
    <div
      style={{
        padding: "14px 16px",
        border: "0.5px solid #1e293b",
        borderRadius: "10px",
        background: "#0f172a",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#f1f5f9",
          marginBottom: "10px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Color mixing guide
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        {OVERLAP_SAMPLES.map((s, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                height: "28px",
                borderRadius: "5px",
                background: multiplyBlend(s.colors),
                border: "0.5px solid rgba(255,255,255,0.08)",
                marginBottom: "4px",
              }}
            />
            <div style={{ fontSize: "10px", color: "#cbd5e1" }}>{s.label}</div>
          </div>
        ))}
        <div style={{ textAlign: "center", flex: 1 }}>
          <div
            style={{
              height: "28px",
              borderRadius: "5px",
              background: multiplyBlend([
                "#FFE500",
                "#FF2200",
                "#0055FF",
                "#00BB44",
                "#FF8800",
              ]),
              border: "0.5px solid rgba(255,255,255,0.08)",
              marginBottom: "4px",
            }}
          />
          <div style={{ fontSize: "10px", color: "#cbd5e1" }}>5+ belts</div>
        </div>
      </div>
      <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.55 }}>
        Belt colors mix like paint. Yellow + blue = green. Red + blue = purple.
        All primary colors together = near black. Darker regions have more
        overlapping growing belts. Click any region to see which belts are
        active at that point.
      </div>
    </div>
  );
}

function BeltInfoPanel({
  activeBelts,
  clickLat,
}: {
  activeBelts: Belt[];
  clickLat: number | null;
}) {
  if (clickLat === null) {
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
          Click anywhere on the map to see which belts overlap at that latitude.
        </span>
      </div>
    );
  }

  const overlapping = activeBelts.filter(
    (b) => clickLat >= b.latMin && clickLat <= b.latMax
  );
  const blendedColor =
    overlapping.length > 0
      ? multiplyBlend(overlapping.map((b) => b.color))
      : "#334155";

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "14px 16px",
        borderRadius: "10px",
        border: `0.5px solid ${
          overlapping.length > 0 ? blendedColor + "88" : "#334155"
        }`,
        background: "#0f172a",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            background: blendedColor,
            flexShrink: 0,
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#94a3b8",
              marginBottom: "3px",
              letterSpacing: "0.04em",
            }}
          >
            {Math.abs(Math.round(clickLat))}°{clickLat >= 0 ? "N" : "S"} latitude
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#f1f5f9",
              marginBottom: "6px",
            }}
          >
            {overlapping.length === 0
              ? "No active belts at this latitude"
              : overlapping.length === 1
              ? `1 belt: ${overlapping[0].name}`
              : `${overlapping.length} belts overlapping`}
          </div>
          {overlapping.length > 1 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
                marginBottom: "8px",
              }}
            >
              {overlapping.map((b) => (
                <span
                  key={b.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: `1px solid ${b.color}`,
                    background: `${b.color}24`,
                    fontSize: "11px",
                    color: "#f1f5f9",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: b.color,
                    }}
                  />
                  {b.name}
                </span>
              ))}
            </div>
          )}
          {overlapping.length === 1 && (
            <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.55 }}>
              <strong style={{ color: "#f1f5f9", fontWeight: 600 }}>
                {overlapping[0].episode}
              </strong>{" "}
              · {overlapping[0].producers}
            </div>
          )}
          {overlapping.length > 1 && (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Episodes: {overlapping.map((b) => b.episode).join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CommodityBeltMap: FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [topoData, setTopoData] = useState<Topology | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Set<string>>(
    new Set(["coffee", "cacao", "tea"])
  );
  const [viewMode, setViewMode] = useState<ViewMode>("bands");
  const [clickLat, setClickLat] = useState<number | null>(null);

  useEffect(() => {
    fetch(WORLD_ATLAS_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Map data failed (${r.status})`);
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
      .geoEqualEarth()
      .scale(153)
      .translate([W / 2, H / 2 + 10]);

    const pathGen = d3.geoPath(proj);

    // Light ocean — required for multiply blend to produce correct overlap colors
    svg
      .append("path")
      .datum({ type: "Sphere" } as d3.GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "#f0f4f8");

    svg
      .append("path")
      .datum(d3.geoGraticule()() as d3.GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("stroke", "#cdd5e0")
      .attr("stroke-width", 0.25);

    svg
      .append("path")
      .datum(
        d3
          .geoGraticule()
          .stepMinor([0, 90])
          .stepMajor([0, 90])() as d3.GeoPermissibleObjects
      )
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("stroke", "#b0bec5")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "3,3");

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
      .attr("fill", "#dde3ea")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4);

    const beltGroup = svg.append("g").attr("class", "belt-group");
    const activeBelts = BELTS.filter((b) => active.has(b.id));

    // Densify the band polygon so d3 can follow the latitude line across
    // the whole globe. With only the 4 corner vertices, d3 connects
    // (-179.9, lat) to (179.9, lat) along the *short* great-circle arc
    // (0.2° across the antimeridian), which renders as a thin sliver
    // instead of a belt. Inserting intermediate vertices every 2° of
    // longitude keeps each edge short enough that the great-circle arc
    // and the rhumb line are visually identical.
    const buildBandCoords = (latMin: number, latMax: number) => {
      const step = 2;
      const lons: number[] = [];
      for (let lon = -179.9; lon <= 179.9; lon += step) lons.push(lon);
      if (lons[lons.length - 1] !== 179.9) lons.push(179.9);

      const top: [number, number][] = lons.map((lon) => [lon, latMax]);
      const bottom: [number, number][] = [...lons]
        .reverse()
        .map((lon) => [lon, latMin]);
      const ring: [number, number][] = [...top, ...bottom, top[0]];
      return [ring];
    };

    activeBelts.forEach((belt) => {
      const bandFeature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: buildBandCoords(belt.latMin, belt.latMax),
        },
      };

      beltGroup
        .append("path")
        .datum(bandFeature as d3.GeoPermissibleObjects)
        .attr("d", pathGen)
        .attr("fill", belt.color)
        .attr("opacity", 0.45)
        .style("mix-blend-mode", "multiply")
        .style("cursor", "pointer");
    });

    svg
      .append("path")
      .datum({ type: "Sphere" } as d3.GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("click", function (event) {
        const [px, py] = d3.pointer(event);
        const coords = proj.invert?.([px, py]);
        if (coords) setClickLat(coords[1]);
      });

    const refLats = [-35, -30, -20, 20, 25, 30, 35];
    const refGroup = svg.append("g");
    refLats.forEach((lat) => {
      const lineFeature = {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [-179.9, lat],
            [179.9, lat],
          ],
        },
      };
      refGroup
        .append("path")
        .datum(lineFeature as d3.GeoPermissibleObjects)
        .attr("d", pathGen)
        .attr("fill", "none")
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 0.4)
        .attr("stroke-dasharray", "2,4")
        .attr("opacity", 0.6);

      const labelCoords = proj([0, lat]);
      if (labelCoords) {
        refGroup
          .append("text")
          .attr("x", labelCoords[0] + 6)
          .attr("y", labelCoords[1] - 2)
          .attr("font-size", "7px")
          .attr("fill", "#94a3b8")
          .attr("font-family", "system-ui, sans-serif")
          .text(`${Math.abs(lat)}°${lat >= 0 ? "N" : "S"}`);
      }
    });

    const eqCoords = proj([0, 0]);
    if (eqCoords) {
      refGroup
        .append("text")
        .attr("x", eqCoords[0] + 6)
        .attr("y", eqCoords[1] - 2)
        .attr("font-size", "7px")
        .attr("fill", "#64748b")
        .attr("font-family", "system-ui, sans-serif")
        .attr("font-weight", "500")
        .text("Equator 0°");
    }
  }, [topoData, active, viewMode]);

  const toggleBelt = useCallback((id: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setActive(new Set()), []);
  const showAll = useCallback(
    () => setActive(new Set(BELTS.map((b) => b.id))),
    []
  );

  const activeBeltsList = BELTS.filter((b) => active.has(b.id));

  return (
    <div
      style={{
        width: "100%",
        fontFamily: "var(--font-geist-sans, Arial, Helvetica, sans-serif)",
      }}
    >
      {/* View mode toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>
          View:
        </span>
        {(["bands", "regions"] as ViewMode[]).map((mode) => {
          const isActive = viewMode === mode;
          const isDisabled = mode === "regions";
          const labels = {
            bands: "Latitude Bands",
            regions: "Production Regions",
          };
          return (
            <button
              key={mode}
              onClick={() => !isDisabled && setViewMode(mode)}
              disabled={isDisabled}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: isActive ? "1.5px solid #475569" : "1px solid #334155",
                background: isActive ? "#0f172a" : "transparent",
                color: isActive
                  ? "#f1f5f9"
                  : isDisabled
                  ? "#475569"
                  : "#cbd5e1",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                cursor: isDisabled ? "not-allowed" : "pointer",
                minHeight: 36,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {labels[mode]}
              {isDisabled && (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#1e293b",
                    color: "#94a3b8",
                    border: "1px solid #334155",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    verticalAlign: "middle",
                    letterSpacing: "0.04em",
                  }}
                >
                  coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginBottom: "10px",
          alignItems: "center",
        }}
      >
        {BELTS.map((belt) => (
          <BeltToggleButton
            key={belt.id}
            belt={belt}
            active={active.has(belt.id)}
            onClick={() => toggleBelt(belt.id)}
          />
        ))}
      </div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={showAll}
          style={{
            background: "none",
            border: "none",
            fontSize: "12px",
            color: "#2dd4bf",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Show all
        </button>
        <button
          onClick={clearAll}
          style={{
            background: "none",
            border: "none",
            fontSize: "12px",
            color: "#94a3b8",
            cursor: "pointer",
            padding: 0,
            textDecoration: "underline",
          }}
        >
          Clear all
        </button>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "11px",
            color: active.size > 0 ? "#cbd5e1" : "#475569",
            background: active.size > 0 ? "#1e293b" : "transparent",
            border: active.size > 0 ? "1px solid #334155" : "none",
            padding: "3px 10px",
            borderRadius: "12px",
            fontWeight: 600,
          }}
        >
          {active.size} of {BELTS.length} active
        </span>
      </div>

      <OverlapLegend />

      {/* Map — SVG interior stays light (required by multiply blend mode) */}
      <div
        style={{
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          border: "0.5px solid #1e293b",
          background: "#f0f4f8",
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
              color: "#64748b",
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
            aria-label="Equal Earth world map showing commodity growing belts by latitude range. Belt colors blend using multiply mode; overlapping regions darken toward brown and black."
          />
        )}
      </div>

      <BeltInfoPanel activeBelts={activeBeltsList} clickLat={clickLat} />

      {active.size > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "0.5px solid #1e293b",
          }}
        >
          {activeBeltsList.map((b) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#cbd5e1",
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: b.color,
                  flexShrink: 0,
                }}
              />
              {b.name}
              <span style={{ color: "#475569" }}>·</span>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                {b.latMin < 0 ? `${Math.abs(b.latMin)}°S` : `${b.latMin}°N`}
                {" – "}
                {b.latMax < 0 ? `${Math.abs(b.latMax)}°S` : `${b.latMax}°N`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: "12px",
          fontSize: "10px",
          color: "#475569",
          textAlign: "right",
        }}
      >
        Equal Earth projection (Patterson, Jenny, and Šavrič, 2018). Land areas
        shown at true proportional size.
      </div>
    </div>
  );
};

export default CommodityBeltMap;
