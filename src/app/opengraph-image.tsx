import { ImageResponse } from "next/og";

// Generated at request time via next/og — no static asset to keep in sync
// with a redesign, no external image-generation service/API key needed.
// Reuses the exact same dark background (#18181a) / accent (#c1442d) /
// rotated-square mark as src/app/icon.svg, scaled up into a full 1200x630
// social card. Uses "HSK" rather than icon.svg's "词" glyph deliberately —
// next/og's renderer (Satori) has no CJK glyph coverage in its default
// fallback font, and there's no way to bundle a proper CJK font file
// without either committing one to the repo (a real font file, sizeable)
// or fetching one from Google Fonts at request time (an external
// dependency this image shouldn't need just to render). "HSK" keeps the
// same color/shape treatment and is legible with the default font.
export const alt = "HSK Quiz — Chinese vocabulary practice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          backgroundColor: "#18181a",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 260,
            height: 180,
            borderRadius: 24,
            border: "6px solid #c1442d",
            color: "#c1442d",
            fontSize: 84,
            fontWeight: 700,
            transform: "rotate(-6deg)",
          }}
        >
          HSK
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>HSK Quiz</div>
          <div style={{ fontSize: 32, color: "#a3a3a3" }}>
            Type it, match it, or read it cold
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
