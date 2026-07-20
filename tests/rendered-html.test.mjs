import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  carryForwardPlans,
  normalizePlanTasks,
  normalizeWorkItems,
} from "../lib/task-plans.ts";
import {
  CHANGELOG,
  CURRENT_VERSION,
  CURRENT_VERSION_LABEL,
} from "../lib/changelog.ts";

test("exports the daily review website", async () => {
  const html = await readFile(
    new URL("../out/index.html", import.meta.url),
    "utf8",
  );
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(html, /日迹/);
  assert.match(html, /正在检查登录状态/);
  assert.match(page, /复盘昨天/);
  assert.match(page, /总结今天/);
  assert.match(page, /今日工作内容/);
  assert.match(page, /未完成加入今天/);
  assert.match(page, /预设明天/);
  assert.match(page, /明日邮件提醒/);
  assert.match(page, /写下这一阶段真正值得留下的东西/);
  assert.match(page, /周期总结/);
  assert.match(page, /周总结/);
  assert.match(page, /月总结/);
  assert.match(page, /季度总结/);
  assert.match(page, /年度总结/);
});

test("keeps the existing browser storage keys", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(page, /daymark-entries/);
  assert.match(page, /daymark-period-summaries/);
  assert.match(page, /daymark-custom-quotes/);
});

test("keeps the visible changelog aligned with the project version", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.equal(CURRENT_VERSION, packageJson.version);
  assert.equal(CURRENT_VERSION_LABEL, "Alpha 0.0.4");
  assert.equal(CHANGELOG[0].version, CURRENT_VERSION_LABEL);
  assert.ok(CHANGELOG[0].changes.length > 0);
});

test("routes feedback to the owner email with useful context", async () => {
  const feedbackPanel = await readFile(
    new URL("../components/FeedbackPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    feedbackPanel,
    /formsubmit\.co\/ajax\/zerobrilliant@gmail\.com/,
  );
  assert.match(feedbackPanel, /产品版本/);
  assert.match(feedbackPanel, /登录账号/);
  assert.match(feedbackPanel, /_honey/);
  assert.match(feedbackPanel, /response\.json\(\)/);
  assert.match(feedbackPanel, /result\?\.success === false/);
});

test("keeps the feedback form on a dedicated subpage", async () => {
  const homePage = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const feedbackPage = await readFile(
    new URL("../app/feedback/page.tsx", import.meta.url),
    "utf8",
  );
  const feedbackHtml = await readFile(
    new URL("../out/feedback/index.html", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(homePage, /<FeedbackPanel/);
  assert.match(homePage, /href="\/feedback\/"/);
  assert.match(feedbackPage, /<FeedbackPanel userEmail=\{user\.email\}/);
  assert.match(feedbackPage, /返回工作台/);
  assert.match(feedbackHtml, /留言反馈｜日迹/);
});

test("uses one cloud autosave flow with clear sync states", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const stateUpserts = page.match(
    /\.from\("daymark_state"\)[\s\S]{0,500}?\.upsert\(/g,
  ) ?? [];

  // One upsert handles first-login migration; the other is the only autosave flow.
  assert.equal(stateUpserts.length, 2);
  assert.match(page, /正在同步云端/);
  assert.match(page, /云端已同步/);
  assert.match(page, /云端同步失败/);
});

test("upgrades legacy completed-work strings to status-aware work items", () => {
  const workItems = normalizeWorkItems(
    ["完成客户报价", { id: "work-2", text: "等待客户回复", status: "in_progress" }],
    "2026-07-19",
  );

  assert.equal(workItems[0].status, "completed");
  assert.equal(workItems[0].text, "完成客户报价");
  assert.equal(workItems[1].status, "in_progress");
});

test("ships the secure email reminder backend", async () => {
  const migrationFiles = [
    new URL(
      "../supabase/migrations/20260720080208_email_reminders.sql",
      import.meta.url,
    ),
  ];
  const migration = await readFile(migrationFiles[0], "utf8");
  const edgeFunction = await readFile(
    new URL(
      "../supabase/functions/send-work-reminders/index.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /unique \(user_id, reminder_date, reminder_time\)/);
  assert.match(edgeFunction, /auth: "secret"/);
  assert.match(edgeFunction, /RESEND_API_KEY/);
  assert.match(edgeFunction, /https:\/\/www\.daily-work-review\.com/);
});

test("upgrades legacy plans and carries unfinished tasks once", () => {
  const previousPlans = normalizePlanTasks(
    [
      "跟进客户报价",
      {
        id: "finished-task",
        text: "发送周报",
        status: "completed",
      },
    ],
    "2026-07-15",
  );

  assert.equal(previousPlans[0].status, "todo");

  const firstCarry = carryForwardPlans({
    previousPlans,
    currentPlans: [],
    carriedTaskIds: [],
    previousDate: "2026-07-15",
  });

  assert.equal(firstCarry.added, 1);
  assert.equal(
    firstCarry.plans[0].text,
    "跟进客户报价",
  );
  assert.equal(
    firstCarry.plans[0].carriedFrom,
    "2026-07-15",
  );

  const secondCarry = carryForwardPlans({
    previousPlans,
    currentPlans: firstCarry.plans,
    carriedTaskIds: firstCarry.carriedTaskIds,
    previousDate: "2026-07-15",
  });

  assert.equal(secondCarry.added, 0);
  assert.equal(secondCarry.plans.length, 1);
});
