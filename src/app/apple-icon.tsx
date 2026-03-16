import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          background:
            "linear-gradient(135deg, rgba(249,211,154,1) 0%, rgba(247,194,197,1) 52%, rgba(242,230,213,1) 100%)",
        }}
      >
        <div
          style={{
            width: 126,
            height: 126,
            borderRadius: 30,
            background: "#171411",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff8f0",
            fontSize: 74,
            fontWeight: 700,
          }}
        >
          창
        </div>
      </div>
    ),
    size,
  );
}
