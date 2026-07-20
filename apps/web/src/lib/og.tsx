import { ImageResponse } from "next/og";

/**
 * Dynamic OG images (Phase 23B) — next/og ImageResponse, token palette only,
 * no gradients, no images. Newsreader is fetched at render time from Google
 * Fonts (cached per lambda); when that fetch fails the default serif-less
 * font renders — degraded but never broken.
 */

const GROUND = "#FAFAF8";
const INK = "#141311";
const INK_SECONDARY = "#5C5952";
const INK_MUTED = "#8A867C";
const LINE = "#E7E4DC";
const ACCENT = "#17456B";

export const OG_SIZE = { width: 1200, height: 630 };

let serifData: ArrayBuffer | null | undefined;

async function loadSerif(): Promise<ArrayBuffer | null> {
  if (serifData !== undefined) {
    return serifData;
  }
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Newsreader:wght@500&display=swap",
      { headers: { "user-agent": "curl/8" } }, // curl UA → plain TTF urls in the CSS
    ).then((response) => response.text());
    const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/.exec(css)?.[1];
    if (url === undefined) {
      serifData = null;
      return null;
    }
    const data: ArrayBuffer = await fetch(url).then((response) => response.arrayBuffer());
    serifData = data;
    return data;
  } catch {
    serifData = null;
    return null;
  }
}

async function fontsOption() {
  const serif = await loadSerif();
  return serif === null
    ? {}
    : { fonts: [{ name: "Newsreader", data: serif, weight: 500 as const, style: "normal" as const }] };
}

const wordmark = (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      gap: 10,
      fontSize: 26,
      color: INK_SECONDARY,
    }}
  >
    <div style={{ width: 14, height: 14, background: ACCENT, display: "flex" }} />
    Continuum Alternatives
  </div>
);

export async function ogEntityImage(input: {
  name: string;
  kindLabel: string;
  country: string | null;
}): Promise<ImageResponse> {
  const options = await fontsOption();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: GROUND,
          padding: 72,
          borderBottom: `14px solid ${ACCENT}`,
        }}
      >
        {wordmark}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div
            style={{
              fontFamily: "Newsreader",
              fontSize: input.name.length > 60 ? 52 : 68,
              lineHeight: 1.1,
              color: INK,
              maxWidth: 1020,
            }}
          >
            {input.name}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 28, color: INK_MUTED }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 2 }}>{input.kindLabel}</span>
            {input.country !== null ? <span>· {input.country}</span> : null}
          </div>
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${LINE}`, paddingTop: 20, fontSize: 22, color: INK_MUTED }}>
          The map of European alternative assets
        </div>
      </div>
    ),
    { ...OG_SIZE, ...options },
  );
}

export async function ogArticleImage(input: { headline: string }): Promise<ImageResponse> {
  const options = await fontsOption();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: GROUND,
          padding: 72,
          borderBottom: `14px solid ${ACCENT}`,
        }}
      >
        {wordmark}
        <div
          style={{
            fontFamily: "Newsreader",
            fontSize: input.headline.length > 70 ? 48 : 60,
            lineHeight: 1.15,
            color: INK,
            maxWidth: 1040,
            display: "flex",
          }}
        >
          {input.headline}
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${LINE}`, paddingTop: 20, fontSize: 24, color: INK_SECONDARY }}>
          Continuum Desk
        </div>
      </div>
    ),
    { ...OG_SIZE, ...options },
  );
}

/** Typographic report cover — accent ground, serif title (reportCoverSvg register). */
export async function ogReportImage(input: { title: string; date: string }): Promise<ImageResponse> {
  const options = await fontsOption();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: ACCENT,
          padding: 84,
        }}
      >
        <div style={{ display: "flex", fontSize: 24, color: GROUND, opacity: 0.85, textTransform: "uppercase", letterSpacing: 3 }}>
          Continuum report · {input.date}
        </div>
        <div
          style={{
            fontFamily: "Newsreader",
            fontSize: 72,
            lineHeight: 1.1,
            color: GROUND,
            maxWidth: 1000,
            display: "flex",
          }}
        >
          {input.title}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: GROUND, opacity: 0.85 }}>
          Continuum Alternatives
        </div>
      </div>
    ),
    { ...OG_SIZE, ...options },
  );
}
