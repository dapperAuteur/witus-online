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

/**
 * Creates a GeoJSON polygon feature from [lonMin, latMin, lonMax, latMax].
 *
 * Vertex order: SW -> NW -> NE -> SE -> SW. This is clockwise on a
 * north-up map, which is what d3-geo's spherical polygon clipping
 * expects for a small outer ring (interior on the RIGHT as you walk).
 * The "obvious" CCW order (SW -> SE -> NE -> NW -> SW) makes d3 render
 * the complement — the entire globe except the intended bounding box.
 * Guards against the bug the user reported in plan 12.
 */
function makePoly(
  lonMin: number,
  latMin: number,
  lonMax: number,
  latMax: number
): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lonMin, latMin],
          [lonMin, latMax],
          [lonMax, latMax],
          [lonMax, latMin],
          [lonMin, latMin],
        ],
      ],
    },
  };
}

/**
 * Commercial production regions per commodity.
 * Rectangular lon/lat bounding boxes are a practical approximation:
 * specific enough to show where production concentrates (not covering
 * oceans) without requiring exact country polygons from topojson.
 * CCW winding is guaranteed by makePoly's corner order so d3-geo draws
 * the intended small interior (not the whole-globe complement).
 */
const PRODUCTION_REGIONS: Record<string, GeoJSON.Feature[]> = {
  coffee: [
    makePoly(-75, -35, -35, 5), // Brazil — Minas Gerais, São Paulo, Paraná
    makePoly(-82, -5, -65, 15), // Colombia — Andes highlands
    makePoly(33, 3, 48, 15), // Ethiopia — Sidamo, Yirgacheffe, Harrar
    makePoly(100, 8, 120, 25), // Vietnam — Central Highlands
    makePoly(95, -8, 141, 8), // Indonesia — Sumatra, Java, Sulawesi
    makePoly(-95, 12, -82, 20), // Guatemala, Honduras, Mexico highlands
    makePoly(29, -7, 42, 7), // Uganda, Kenya — eastern Africa
  ],
  cacao: [
    makePoly(-9, 3, -2, 11), // Côte d'Ivoire
    makePoly(-4, 4, 2, 12), // Ghana
    makePoly(5, 3, 15, 12), // Nigeria, Cameroon
    makePoly(95, -10, 141, 5), // Indonesia
    makePoly(-82, -5, -73, 3), // Ecuador
    makePoly(-75, -20, -35, 5), // Brazil — Bahia, Pará
  ],
  tea: [
    makePoly(106, 20, 125, 35), // China — Yunnan, Fujian, Zhejiang
    makePoly(72, 8, 96, 28), // India — Assam, Darjeeling, Nilgiris
    makePoly(79, 6, 82, 10), // Sri Lanka
    makePoly(33, -5, 42, 5), // Kenya — Rift Valley
    makePoly(98, 6, 106, 20), // Myanmar, Thailand northern highlands
    makePoly(35, 35, 53, 43), // Georgia, Turkey, Azerbaijan (Black Sea coast)
  ],
  sugar: [
    makePoly(-75, -35, -35, 5), // Brazil — São Paulo, Minas Gerais
    makePoly(72, 18, 96, 28), // India — Uttar Pradesh, Maharashtra
    makePoly(100, 12, 125, 25), // China — Guangxi, Yunnan
    makePoly(143, -25, 155, -15), // Australia — Queensland
    makePoly(-85, 15, -65, 25), // Caribbean — Cuba, Dominican Republic, Jamaica
    makePoly(-65, -30, -55, -18), // Argentina — Tucumán
    makePoly(30, -32, 35, -22), // South Africa — KwaZulu-Natal
    makePoly(100, -8, 118, 8), // Thailand, Indonesia
  ],
  guayusa: [
    makePoly(-80, -5, -73, 2), // Ecuador — Amazon basin
    makePoly(-78, -8, -68, 2), // Peru — upper Amazon tributaries
    makePoly(-76, -5, -68, 4), // Colombia — Amazon headwaters
  ],
  kola: [
    makePoly(-15, 3, 5, 10), // Sierra Leone, Liberia, Côte d'Ivoire
    makePoly(-5, 4, 10, 11), // Ghana, Togo, Benin
    makePoly(3, 4, 15, 12), // Nigeria (primary producer)
    makePoly(10, 3, 25, 10), // Cameroon, Congo
  ],
  tobacco: [
    makePoly(-85, 33, -75, 42), // USA — Virginia, Kentucky, North Carolina
    makePoly(103, 18, 125, 30), // China — Yunnan, Guizhou, Henan
    makePoly(-55, -30, -35, -10), // Brazil — Rio Grande do Sul, Santa Catarina
    makePoly(72, 14, 82, 24), // India — Andhra Pradesh, Gujarat
    makePoly(29, -20, 36, -10), // Malawi, Zimbabwe, Zambia
    makePoly(-79, -5, -73, 1), // Ecuador
    makePoly(18, 41, 29, 47), // Bulgaria, Romania (Balkans)
  ],
  cannabis: [
    makePoly(60, 28, 75, 42), // Afghanistan — primary illicit source
    makePoly(92, 20, 102, 28), // Myanmar — Golden Triangle
    makePoly(95, 18, 103, 25), // Thailand northern highlands
    makePoly(-115, 30, -105, 42), // Mexico — Sinaloa, Durango
    makePoly(-125, 32, -113, 42), // USA — California, Pacific Northwest
    makePoly(-5, 30, 4, 36), // Morocco — Rif Mountains
    makePoly(-80, 4, -72, 12), // Colombia — traditional and legal farms
    makePoly(19, -30, 32, -20), // South Africa — Lesotho, Eastern Cape
  ],
  coca: [
    makePoly(-78, -5, -68, 8), // Colombia — primary producer (Putumayo, Nariño)
    makePoly(-80, -18, -68, -2), // Peru — VRAEM, Huallaga Valley
    makePoly(-70, -22, -60, -10), // Bolivia — Chapare, Yungas
  ],
  khat: [
    makePoly(38, 6, 46, 15), // Ethiopia — Harar, Oromia highlands
    makePoly(34, -2, 42, 5), // Kenya — Meru County, Nyambene Hills
    makePoly(43, 12, 50, 18), // Yemen — highland terraces
    makePoly(40, 10, 50, 15), // Djibouti, Somaliland corridor
  ],
  poppy: [
    makePoly(60, 28, 75, 38), // Afghanistan — Helmand, Kandahar (primary)
    makePoly(92, 20, 102, 28), // Myanmar — Shan State (Golden Triangle)
    makePoly(-115, 28, -105, 38), // Mexico — Sinaloa, Guerrero
    makePoly(44, 34, 56, 40), // Iran — traditional areas
    makePoly(65, 36, 75, 43), // Tajikistan, Kyrgyzstan (Central Asia)
    makePoly(75, 28, 88, 36), // Pakistan, northern India
  ],
  peyote: [
    // Most geographically specific — Chihuahuan Desert only
    makePoly(-105, 22, -95, 32), // Texas (USA) + Tamaulipas, Coahuila (Mexico)
  ],
};

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
    modeB: true,
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
    modeB: true,
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
    modeB: true,
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
    modeB: true,
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
    modeB: true,
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
    modeB: true,
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
    modeB: true,
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
    modeB: true,
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
    modeB: true,
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
        padding: "8px 14px",
        borderRadius: "6px",
        border: active ? `1.5px solid ${belt.color}` : "1px solid #475569",
        background: active ? `${belt.color}20` : "transparent",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: active ? 600 : 500,
        color: active ? "#f8fafc" : "#e2e8f0",
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
          fontSize: "13px",
          fontWeight: 600,
          color: "#f8fafc",
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
            <div style={{ fontSize: "12px", color: "#e2e8f0" }}>{s.label}</div>
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
          <div style={{ fontSize: "12px", color: "#e2e8f0" }}>5+ belts</div>
        </div>
      </div>
      <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.55 }}>
        Belt colors mix like paint. Yellow + blue = green. Red + blue = purple.
        All primary colors together = near black. Darker regions have more
        overlapping growing belts. Click any region to see which belts are
        active at that point.
      </div>
    </div>
  );
}

interface ClickPoint {
  lat: number;
  lon: number;
}

function regionsAtPoint(activeBelts: Belt[], point: ClickPoint): Belt[] {
  const hits: Belt[] = [];
  for (const belt of activeBelts) {
    const regions = PRODUCTION_REGIONS[belt.id];
    if (!regions?.length) continue;
    const covers = regions.some((feat) =>
      d3.geoContains(feat, [point.lon, point.lat])
    );
    if (covers) hits.push(belt);
  }
  return hits;
}

function IdlePanel({ hint }: { hint: string }) {
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
      <span style={{ fontSize: "14px", color: "#cbd5e1" }}>{hint}</span>
    </div>
  );
}

function BeltInfoPanel({
  viewMode,
  activeBelts,
  clickPoint,
}: {
  viewMode: ViewMode;
  activeBelts: Belt[];
  clickPoint: ClickPoint | null;
}) {
  if (clickPoint === null) {
    return (
      <IdlePanel
        hint={
          viewMode === "bands"
            ? "Click anywhere on the map to see which belts overlap at that latitude."
            : "Click inside a colored region to see which commodities grow there."
        }
      />
    );
  }

  // A single list of belts that cover the clicked point, computed per mode.
  const overlapping =
    viewMode === "bands"
      ? activeBelts.filter(
          (b) => clickPoint.lat >= b.latMin && clickPoint.lat <= b.latMax
        )
      : regionsAtPoint(activeBelts, clickPoint);

  const overlapColors = overlapping.map((b) => b.color);
  const blendedColor =
    overlapColors.length > 0 ? multiplyBlend(overlapColors) : "#334155";

  const coordLabel =
    viewMode === "bands"
      ? `${Math.abs(Math.round(clickPoint.lat))}°${
          clickPoint.lat >= 0 ? "N" : "S"
        } latitude`
      : `${Math.abs(Math.round(clickPoint.lat))}°${
          clickPoint.lat >= 0 ? "N" : "S"
        }, ${Math.abs(Math.round(clickPoint.lon))}°${
          clickPoint.lon >= 0 ? "E" : "W"
        }`;

  let headline: string;
  if (overlapping.length === 0) {
    headline =
      viewMode === "bands"
        ? "No active belts at this latitude"
        : "No production regions at this location";
  } else if (overlapping.length === 1) {
    headline = `1 belt: ${overlapping[0].name}`;
  } else {
    headline =
      viewMode === "bands"
        ? `${overlapping.length} belts overlapping`
        : `${overlapping.length} commodities grow here`;
  }

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "14px 16px",
        borderRadius: "10px",
        border: `0.5px solid ${
          overlapColors.length > 0 ? blendedColor + "88" : "#334155"
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
              fontSize: "13px",
              fontWeight: 600,
              color: "#cbd5e1",
              marginBottom: "4px",
              letterSpacing: "0.04em",
            }}
          >
            {coordLabel}
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#f8fafc",
              marginBottom: "6px",
            }}
          >
            {headline}
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
                    padding: "4px 10px",
                    borderRadius: "4px",
                    border: `1px solid ${b.color}`,
                    background: `${b.color}24`,
                    fontSize: "13px",
                    color: "#f8fafc",
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
            <div style={{ fontSize: "14px", color: "#e2e8f0", lineHeight: 1.55 }}>
              <strong style={{ color: "#f8fafc", fontWeight: 600 }}>
                {overlapping[0].episode}
              </strong>{" "}
              · {overlapping[0].producers}
            </div>
          )}
          {overlapping.length > 1 && (
            <div style={{ fontSize: "13px", color: "#cbd5e1" }}>
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
  const [clickPoint, setClickPoint] = useState<ClickPoint | null>(null);

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

    if (viewMode === "bands") {
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
    } else {
      // regions mode — render approximate commercial growing polygons
      activeBelts.forEach((belt) => {
        const regions = PRODUCTION_REGIONS[belt.id];
        if (!regions?.length) return;
        regions.forEach((feat) => {
          beltGroup
            .append("path")
            .datum(feat as d3.GeoPermissibleObjects)
            .attr("d", pathGen)
            .attr("fill", belt.color)
            .attr("opacity", 0.45)
            .style("mix-blend-mode", "multiply")
            .style("cursor", "pointer");
        });
      });
    }

    svg
      .append("path")
      .datum({ type: "Sphere" } as d3.GeoPermissibleObjects)
      .attr("d", pathGen)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("click", function (event) {
        const [px, py] = d3.pointer(event);
        const coords = proj.invert?.([px, py]);
        if (coords) setClickPoint({ lon: coords[0], lat: coords[1] });
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

  const beltsWithRegionsCount = BELTS.filter(
    (b) => PRODUCTION_REGIONS[b.id]?.length
  ).length;

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
        <span
          style={{
            fontSize: "14px",
            color: "#e2e8f0",
            fontWeight: 600,
          }}
        >
          View:
        </span>
        {(["bands", "regions"] as ViewMode[]).map((mode) => {
          const isActive = viewMode === mode;
          const labels = {
            bands: "Latitude Bands",
            regions: "Production Regions",
          };
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: isActive ? "1.5px solid #94a3b8" : "1px solid #475569",
                background: isActive ? "#1e293b" : "transparent",
                color: isActive ? "#f8fafc" : "#e2e8f0",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                minHeight: 40,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {labels[mode]}
            </button>
          );
        })}
        {viewMode === "regions" && (
          <span
            style={{
              fontSize: "13px",
              color: "#cbd5e1",
              marginLeft: "4px",
            }}
          >
            Production regions mapped for {beltsWithRegionsCount} of{" "}
            {BELTS.length} commodities.
          </span>
        )}
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
            fontSize: "14px",
            color: "#5eead4",
            cursor: "pointer",
            padding: "4px 2px",
            textDecoration: "underline",
            fontWeight: 600,
          }}
        >
          Show all
        </button>
        <button
          onClick={clearAll}
          style={{
            background: "none",
            border: "none",
            fontSize: "14px",
            color: "#cbd5e1",
            cursor: "pointer",
            padding: "4px 2px",
            textDecoration: "underline",
            fontWeight: 600,
          }}
        >
          Clear all
        </button>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "13px",
            color: active.size > 0 ? "#e2e8f0" : "#64748b",
            background: active.size > 0 ? "#1e293b" : "transparent",
            border: active.size > 0 ? "1px solid #475569" : "none",
            padding: "4px 12px",
            borderRadius: "12px",
            fontWeight: 600,
          }}
        >
          {active.size} of {BELTS.length} active
        </span>
      </div>

      <OverlapLegend />

      {/* Map — SVG interior stays light (required by multiply blend mode).
          isolation: isolate scopes the mix-blend-mode to this container so
          multiply doesn't blend with the dark app background. */}
      <div
        style={{
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          border: "0.5px solid #1e293b",
          background: "#f0f4f8",
          isolation: "isolate",
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

      <BeltInfoPanel
        viewMode={viewMode}
        activeBelts={activeBeltsList}
        clickPoint={clickPoint}
      />

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
          {activeBeltsList.map((b) => {
            const regionCount = PRODUCTION_REGIONS[b.id]?.length ?? 0;
            const trailing =
              viewMode === "regions"
                ? regionCount > 0
                  ? `${regionCount} region${regionCount === 1 ? "" : "s"}`
                  : "no regions yet"
                : `${
                    b.latMin < 0 ? `${Math.abs(b.latMin)}°S` : `${b.latMin}°N`
                  } – ${
                    b.latMax < 0 ? `${Math.abs(b.latMax)}°S` : `${b.latMax}°N`
                  }`;
            return (
              <div
                key={b.id}
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
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: b.color,
                    flexShrink: 0,
                  }}
                />
                {b.name}
                <span style={{ color: "#64748b" }}>·</span>
                <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                  {trailing}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: "12px",
          fontSize: "12px",
          color: "#64748b",
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
