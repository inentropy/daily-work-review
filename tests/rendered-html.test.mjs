import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(page, /预设明天/);
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

test("uses one cloud autosave flow with clear sync states", async () => {
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const upserts = page.match(/\.upsert\(/g) ?? [];

  // One upsert handles first-login migration; the other is the only autosave flow.
  assert.equal(upserts.length, 2);
  assert.match(page, /正在同步云端/);
  assert.match(page, /云端已同步/);
  assert.match(page, /云端同步失败/);
});
