import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LIAR GAME | 누가 거짓말을 하고 있을까?",
    template: "%s | LIAR GAME",
  },
  description: "친구들과 실시간으로 역할을 추리하고, 라이어를 찾아내는 멀티플레이어 추리 게임입니다.",
  applicationName: "LIAR GAME",
  keywords: ["라이어 게임", "추리 게임", "멀티플레이어", "실시간 게임", "파티 게임"],
  authors: [{ name: "LIAR GAME" }],
  category: "game",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
  },
  openGraph: {
    title: "LIAR GAME | 누가 거짓말을 하고 있을까?",
    description: "단서를 공유하고, 거짓말을 가려내세요. 실시간 멀티플레이어 추리 게임.",
    type: "website",
    locale: "ko_KR",
    siteName: "LIAR GAME",
  },
  twitter: {
    card: "summary",
    title: "LIAR GAME | 누가 거짓말을 하고 있을까?",
    description: "단서를 공유하고, 거짓말을 가려내세요. 실시간 멀티플레이어 추리 게임.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
