import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "留言反馈｜日迹",
  description: "向日迹提交功能建议、问题反馈和使用体验。",
};

export default function FeedbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
