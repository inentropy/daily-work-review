import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("exports the daily review website", async () => {
  const html = await readFile(
    new URL("../out/index.html", import.meta.url),
    "utf8",
  );

  assert.match(html, /日迹/);
  assert.match(html, /复盘昨天/);
  assert.match(html, /总结今天/);
  assert.match(html, /预设明天/);
  assert.match(html, /周期总结/);
  assert.match(html, /周总结/);
  assert.match(html, /月总结/);
  assert.match(html, /季度总结/);
  assert.match(html, /年度总结/);
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