import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#2563eb",
          borderRadius: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: "bold", marginTop: -8 }}>¥</div>
        <div style={{ fontSize: 16, fontWeight: "bold", marginTop: -4 }}>サークル費用</div>
      </div>
    ),
    { ...size }
  );
}
