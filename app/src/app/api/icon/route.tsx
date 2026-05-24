import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const size = Number(request.nextUrl.searchParams.get("size")) || 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#2563eb",
          borderRadius: size * 0.17,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div style={{ fontSize: size * 0.4, fontWeight: "bold" }}>¥</div>
        <div style={{ fontSize: size * 0.1, fontWeight: "bold", marginTop: size * -0.02 }}>
          サークル費用
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
