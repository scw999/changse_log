import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "창세록",
    short_name: "창세록",
    description: "생각, 단어, 콘텐츠, 장소, 활동 기록을 모아 다시 꺼내보는 개인 아카이브",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f1ea",
    theme_color: "#f6f1ea",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "최근 기록",
        short_name: "최근",
        url: "/recent",
      },
      {
        name: "관리자",
        short_name: "관리",
        url: "/admin",
      },
    ],
  };
}
