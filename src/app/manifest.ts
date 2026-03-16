import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "창세록",
    short_name: "창세록",
    description: "생각, 단어, 콘텐츠, 장소, 활동 기록을 모아 다시 꺼내보는 개인 아카이브",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1ea",
    theme_color: "#f6f1ea",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
