import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日迹｜每日工作复盘",
  description: "记录今天、复盘昨天、预设明天，让每一天的工作清晰可见。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
