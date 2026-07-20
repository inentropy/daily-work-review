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

export const CURRENT_VERSION = "0.0.4-alpha.0";
export const CURRENT_VERSION_LABEL = "Alpha 0.0.4";

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "Alpha 0.0.4",
    date: "2026-07-20",
    title: "更有回应的每日工作台",
    summary: "让工作内容、昨日复盘、明日提醒和周期总结形成更清晰、更有反馈感的使用闭环。",
    changes: [
      { type: "新增", text: "今日工作内容支持待开始、进行中、已完成和延期四种状态。" },
      { type: "新增", text: "昨日复盘可以直接更新状态、返回编辑，并将未完成工作加入今天。" },
      { type: "新增", text: "明日计划增加可配置的邮件提醒设置与安全的服务端提醒链路。" },
      { type: "优化", text: "长工作内容支持多行自动展开，避免文字被截断。" },
      { type: "优化", text: "周期复盘填写区支持展开和收起，减少主页空间占用。" },
      { type: "优化", text: "提高重点文字字号，并加强圆角、悬停、点击和焦点反馈。" },
    ],
  },
  {
    version: "Alpha 0.0.3",
    date: "2026-07-17",
    title: "更轻盈的工作台",
    summary: "把完整留言表单迁移到独立页面，让主页继续专注于每日复盘与周期总结。",
    changes: [
      { type: "优化", text: "留言反馈迁移至独立子页面，减少主页占用空间。" },
      { type: "新增", text: "主页页脚增加轻量留言入口，随时可以进入反馈页面。" },
      { type: "优化", text: "反馈子页面沿用登录状态、产品视觉和移动端适配。" },
    ],
  },
  {
    version: "Alpha 0.0.2",
    date: "2026-07-17",
    title: "留言反馈通道",
    summary: "让每一位使用者都能从日迹里直接发送建议、问题和真实感受。",
    changes: [
      { type: "新增", text: "新增留言反馈板块，支持功能建议、问题反馈、体验优化和其他留言。" },
      { type: "新增", text: "留言可直接转发至开发者邮箱，并自动附带当前产品版本。" },
      { type: "优化", text: "自动填入登录账号邮箱作为可选联系方式，减少重复输入。" },
      { type: "优化", text: "增加发送中、发送成功和发送失败状态，以及防垃圾留言蜜罐字段。" },
    ],
  },
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
