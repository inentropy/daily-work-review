import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日迹｜工作复盘与周期总结",
  description: "记录今天、复盘昨天、预设明天，并自动生成周、月、季度和年度工作总结。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
