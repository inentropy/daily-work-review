export type ChangeType = "新增" | "优化" | "修复";

export type ChangelogItem = {
  type: ChangeType;
  text: string;
};

export type ChangelogRelease = {
  version: string;
  date: string;
  title: string;
  summary: string;
  changes: ChangelogItem[];
};

export const CURRENT_VERSION = "0.0.1-alpha.0";
export const CURRENT_VERSION_LABEL = "Alpha 0.0.1";

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "Alpha 0.0.1",
    date: "2026-07-17",
    title: "日迹 Alpha 初始体验版",
    summary: "建立从每日记录、任务推进到周期总结的首个完整工作复盘闭环。",
    changes: [
      { type: "新增", text: "每日工作台：复盘昨天、总结今天，并提前安排明日计划。" },
      { type: "新增", text: "周、月、季度和年度总结，自动汇总工作记录与专注数据。" },
      { type: "新增", text: "待办状态管理与未完成任务自动顺延。" },
      { type: "新增", text: "Supabase 账号登录、注册与云端数据同步。" },
      { type: "新增", text: "随机语录、自定义语录，以及日报和周期总结一键复制。" },
      { type: "优化", text: "重新设计登录与注册体验，加入确认密码和清晰的交互反馈。" },
      { type: "优化", text: "适配桌面端与手机端，并显示明确的云端同步状态。" },
    ],
  },
];
