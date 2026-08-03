import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * AtomicShareCard image — branded OG card for any chart/stat. Dark ground,
 * class accent bar, serif-feel title, mono footer. Deep links carry the
 * anchor; this renders the visual.
 */

const CLASS_HEX: Record<string, string> = {
  "private-equity": "#47b598",
  "private-credit": "#c69a3d",
  "real-assets": "#b0a63e",
  "hedge-funds": "#a583cf",
  structured: "#4aa6ab",
  esoteric: "#b56aa8",
  collectibles: "#bd6e88",
  climate: "#6fae5c",
  digital: "#8b8ed6",
  "cross-asset": "#7aa7cd",
};

export function GET(req: NextRequest): ImageResponse {
  const params = req.nextUrl.searchParams;
  const title = (params.get("title") ?? "Continuum Alternatives").slice(0, 120);
  const stat = (params.get("stat") ?? "").slice(0, 80);
  const cls = params.get("cls") ?? "cross-asset";
  const accent = CLASS_HEX[cls] ?? CLASS_HEX["cross-asset"]!;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#121212",
          color: "#edecea",
          padding: "56px 64px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", width: 160, height: 4, backgroundColor: accent }} />
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 52,
            lineHeight: 1.15,
            fontWeight: 500,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        {stat !== "" ? (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 30,
              color: "#a5a29b",
              fontFamily: "monospace",
            }}
          >
            {stat}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#716e67",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          <span>Continuum Alternatives</span>
          <span>Provenance-first · 30,500 entities · 39 countries</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
