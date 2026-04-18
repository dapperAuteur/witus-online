import { ImageResponse } from "next/og";
import { ogEntries } from "@/lib/og";

export const runtime = "edge";

const ACCENT_COLORS = [
  "#e879f9", // fuchsia-400, CentenarianOS
  "#fbbf24", // amber-400, Work.WitUS
  "#a78bfa", // violet-400, Tour Manager OS
  "#38bdf8", // sky-400, Wanderlearn
  "#34d399", // emerald-400, Fly.WitUS
  "#fb7185", // rose-400, FlashLearnAI
  "#2dd4bf", // teal-400, Learn.WitUS
  "#a3e635", // lime-400, AwesomeWebStore
];

const ORBIT_POSITIONS = [
  { top: 6, left: 44 }, // fuchsia, top
  { top: 12, left: 74 }, // amber, upper-right
  { top: 44, left: 82 }, // violet, right
  { top: 74, left: 74 }, // sky, lower-right
  { top: 82, left: 44 }, // emerald, bottom
  { top: 74, left: 12 }, // rose, lower-left
  { top: 44, left: 6 }, // teal, left
  { top: 12, left: 12 }, // lime, upper-left
];

function LogoMark() {
  const SIZE = 96;
  const DOT = 8;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: SIZE,
        height: SIZE,
      }}
    >
      {ORBIT_POSITIONS.map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: ACCENT_COLORS[i],
            top: (pos.top / 96) * SIZE,
            left: (pos.left / 96) * SIZE,
          }}
        />
      ))}
      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          color: "#f8fafc",
          letterSpacing: -2,
          lineHeight: 1,
          marginTop: 2,
        }}
      >
        W
      </div>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const entry = ogEntries[slug] ?? ogEntries.home;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#020617",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: `linear-gradient(90deg, ${ACCENT_COLORS.join(", ")})`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
          <LogoMark />
          <span
            style={{
              marginLeft: 24,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            WitUS.online
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#f8fafc",
              lineHeight: 1.05,
              letterSpacing: -2,
              marginBottom: 24,
            }}
          >
            {entry.title}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#94a3b8",
              lineHeight: 1.3,
              letterSpacing: -0.5,
            }}
          >
            {entry.subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 4,
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Live Long. Work Free.
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            {ACCENT_COLORS.map((color) => (
              <div
                key={color}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
