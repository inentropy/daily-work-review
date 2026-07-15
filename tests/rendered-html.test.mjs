import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the daily review and period summary workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>日迹｜工作复盘与周期总结<\/title>/i);
  assert.match(html, /复盘昨天/);
  assert.match(html, /总结今天/);
  assert.match(html, /预设明天/);
  assert.match(html, /周期总结/);
  assert.match(html, /周总结/);
  assert.match(html, /月总结/);
  assert.match(html, /季度总结/);
  assert.match(html, /年度总结/);
  assert.match(html, /关键成果/);
  assert.match(html, /下一阶段重点/);
});

test("keeps period summaries local and static deployment sources in sync", async () => {
  const [page, staticHtml, staticJs] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../netlify-static/index.html", import.meta.url), "utf8"),
    readFile(new URL("../netlify-static/app.js", import.meta.url), "utf8"),
  ]);

  for (const source of [page, staticJs]) {
    assert.match(source, /daymark-entries/);
    assert.match(source, /daymark-period-summaries/);
    assert.match(source, /week/);
    assert.match(source, /month/);
    assert.match(source, /quarter/);
    assert.match(source, /year/);
  }

  assert.match(page, /copyPeriodSummary/);
  assert.match(staticHtml, /id="periodSummary"/);
  assert.match(staticHtml, /data-summary-field="achievements"/);
  assert.match(staticJs, /copySummaryBtn/);
  assert.match(staticJs, /periodBounds/);
});
