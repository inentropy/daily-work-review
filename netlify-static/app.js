const pad = value => String(value).padStart(2, "0");
const key = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const move = (value, days) => { const date = new Date(value + "T12:00:00"); date.setDate(date.getDate() + days); return key(date); };
const empty = () => ({ wins: [""], progress: "", blockers: "", learnings: "", tomorrow: [""], mood: 4, focus: 7 });
const emptySummary = () => ({ achievements: "", growth: "", challenges: "", nextFocus: "" });
const quotes = ["复盘不是回头看，而是为了走得更远。", "先完成，再完美。", "每天进步一点点，时间会给出答案。", "把重要的事，放在精力最好的时刻。", "真正的效率，是知道什么可以不做。", "清晰的计划，是行动最好的起点。", "今天的积累，会成为明天的底气。", "专注当下，结果会在路上出现。", "困难不是终点，而是需要调整方法的信号。", "完成一件重要的事，胜过忙完十件琐事。", "记录让努力有迹可循，复盘让经验可以复用。", "给明天留好方向，也给今天留一点余地。"]; 
const summaryLabels = { week: "周总结", month: "月总结", quarter: "季度总结", year: "年度总结" };
const $ = selector => document.querySelector(selector);
const el = (tag, className) => { const node = document.createElement(tag); if (className) node.className = className; return node; };

let customQuotes = [];
let entries = {};
let periodSummaries = {};
try { customQuotes = JSON.parse(localStorage.getItem("daymark-custom-quotes") || "[]"); } catch (error) {}
try { entries = JSON.parse(localStorage.getItem("daymark-entries") || "{}"); } catch (error) {}
try { periodSummaries = JSON.parse(localStorage.getItem("daymark-period-summaries") || "{}"); } catch (error) {}

let quoteIndex = -1;
let date = key(new Date());
let summaryType = "week";
let summaryAnchor = key(new Date());
let saveTimer;

const allQuotes = () => [...quotes, ...customQuotes];
const current = () => entries[date] || (entries[date] = empty());
const hasEntryContent = entry => Boolean(entry && ((entry.wins || []).some(Boolean) || (entry.progress || "").trim() || (entry.blockers || "").trim() || (entry.learnings || "").trim() || (entry.tomorrow || []).some(Boolean)));
const readableDate = date => new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);

function periodBounds(anchor, type) {
  const source = new Date(anchor + "T12:00:00");
  let start = new Date(source);
  let end = new Date(source);
  let label = "";
  if (type === "week") {
    const mondayOffset = (source.getDay() + 6) % 7;
    start.setDate(source.getDate() - mondayOffset);
    end = new Date(start); end.setDate(start.getDate() + 6);
    label = `${start.getFullYear()}年 ${readableDate(start)}—${readableDate(end)}`;
  } else if (type === "month") {
    start = new Date(source.getFullYear(), source.getMonth(), 1, 12);
    end = new Date(source.getFullYear(), source.getMonth() + 1, 0, 12);
    label = `${source.getFullYear()}年${source.getMonth() + 1}月`;
  } else if (type === "quarter") {
    const quarter = Math.floor(source.getMonth() / 3);
    start = new Date(source.getFullYear(), quarter * 3, 1, 12);
    end = new Date(source.getFullYear(), quarter * 3 + 3, 0, 12);
    label = `${source.getFullYear()}年第${quarter + 1}季度`;
  } else {
    start = new Date(source.getFullYear(), 0, 1, 12);
    end = new Date(source.getFullYear(), 11, 31, 12);
    label = `${source.getFullYear()}年度`;
  }
  const startKey = key(start);
  const endKey = key(end);
  return { startKey, endKey, storageKey: `${type}:${startKey}`, label };
}

function periodData() {
  const period = periodBounds(summaryAnchor, summaryType);
  const records = Object.entries(entries)
    .filter(([recordDate, entry]) => recordDate >= period.startKey && recordDate <= period.endKey && hasEntryContent(entry))
    .sort(([a], [b]) => b.localeCompare(a));
  const wins = records.flatMap(([recordDate, entry]) => (entry.wins || []).filter(Boolean).map(text => ({ date: recordDate, text })));
  const progress = records.filter(([, entry]) => (entry.progress || "").trim()).map(([recordDate, entry]) => ({ date: recordDate, text: entry.progress.trim() }));
  const plans = records.reduce((count, [, entry]) => count + (entry.tomorrow || []).filter(Boolean).length, 0);
  const averageFocus = records.length ? (records.reduce((sum, [, entry]) => sum + (Number(entry.focus) || 0), 0) / records.length).toFixed(1) : "—";
  const summary = periodSummaries[period.storageKey] || emptySummary();
  return { period, records, wins, progress, plans, averageFocus, summary };
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = `✓ ${message}`;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 1800);
}

async function copyText(text) {
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error("clipboard timeout")), 600))
    ]);
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
}

function showQuote() { $("#dailyQuote").textContent = `“${allQuotes()[quoteIndex]}”`; }
function randomQuote() {
  const pool = allQuotes();
  let next = quoteIndex;
  while (next === quoteIndex) next = Math.floor(Math.random() * pool.length);
  quoteIndex = next;
  showQuote();
}
function closeQuoteEditor() {
  $("#quoteModal").hidden = true;
  $("#newQuoteInput").value = "";
  $("#quoteLength").textContent = "0";
  $("#saveQuoteBtn").disabled = true;
}
function saveCustomQuote() {
  const value = $("#newQuoteInput").value.trim();
  if (!value) return;
  customQuotes.push(value);
  localStorage.setItem("daymark-custom-quotes", JSON.stringify(customQuotes));
  quoteIndex = allQuotes().length - 1;
  showQuote();
  closeQuoteEditor();
}

function save() {
  $(".save-state").classList.add("saving");
  $("#saveText").textContent = "正在保存";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem("daymark-entries", JSON.stringify(entries));
    $(".save-state").classList.remove("saving");
    $("#saveText").textContent = "已自动保存";
  }, 350);
}

function bindText(id, field) {
  const input = $(id);
  input.value = current()[field];
  input.oninput = () => { current()[field] = input.value; renderPeriod(); save(); };
}

function renderList(field, target, type) {
  const box = $(target);
  box.innerHTML = "";
  current()[field].forEach((value, index) => {
    const row = el("div", type);
    const number = el("span", value && field === "wins" ? "checked" : "");
    number.textContent = value && field === "wins" ? "✓" : pad(index + 1);
    const input = el("input");
    input.value = value;
    input.placeholder = field === "wins" ? "我今天完成了什么？" : "接下来要推进……";
    input.oninput = () => { current()[field][index] = input.value; renderStats(); renderPeriod(); save(); };
    const remove = el("button");
    remove.textContent = "×";
    remove.onclick = () => { current()[field].splice(index, 1); if (!current()[field].length) current()[field].push(""); render(); save(); };
    row.append(number, input, remove);
    box.append(row);
  });
}

function renderStats() {
  const entry = current();
  $("#doneCount").textContent = entry.wins.filter(Boolean).length;
  $("#planCount").textContent = entry.tomorrow.filter(Boolean).length;
  $("#focusStat").textContent = entry.focus;
  $("#focusLabel").textContent = entry.focus >= 8 ? "状态很棒" : entry.focus >= 6 ? "稳步推进" : "注意休息";
}

function renderYesterday() {
  const yesterday = entries[move(date, -1)];
  const box = $("#yesterdayCard");
  const wins = (yesterday?.wins || []).filter(Boolean);
  box.innerHTML = "";
  const head = el("div", "yesterday-block-title");
  const title = el("span"); title.textContent = "昨天完成的工作";
  const count = el("b"); count.textContent = `${wins.length} 项`;
  head.append(title, count); box.append(head);
  if (wins.length) {
    const list = el("div", "past-list");
    wins.forEach(value => { const row = el("div", "past-item"); const check = el("span"); check.textContent = "✓"; const text = el("p"); text.textContent = value; row.append(check, text); list.append(row); });
    box.append(list);
  } else {
    const emptyText = el("p", "empty-past"); emptyText.textContent = "昨天还没有记录已完成的工作。"; box.append(emptyText);
  }
  const summary = el("div", "yesterday-summary");
  const summaryTitle = el("span"); summaryTitle.textContent = "昨天的进展摘要";
  const summaryText = el("p"); summaryText.textContent = yesterday?.progress || "暂无进展摘要。";
  summary.append(summaryTitle, summaryText); box.append(summary);
}

function renderEmpty(target, symbol, title, hint) {
  target.className = "period-empty";
  const icon = el("span"); icon.textContent = symbol;
  const text = el("p"); text.append(document.createTextNode(title), el("br"));
  const small = el("small"); small.textContent = hint; text.append(small);
  target.append(icon, text);
}

function renderPeriod() {
  const data = periodData();
  document.querySelectorAll("[data-summary-type]").forEach(button => {
    const active = button.dataset.summaryType === summaryType;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $("#periodLabel").textContent = data.period.label;
  $("#periodRange").textContent = `${data.period.startKey} — ${data.period.endKey}`;
  $("#metricDays").textContent = data.records.length;
  $("#metricWins").textContent = data.wins.length;
  $("#metricFocus").textContent = data.averageFocus;
  $("#metricFocusUnit").textContent = data.averageFocus === "—" ? "" : "/10";
  $("#metricPlans").textContent = data.plans;
  $("#periodWinCount").textContent = `${data.wins.length} 项`;
  $("#periodProgressCount").textContent = `${data.progress.length} 条`;

  const winsBox = $("#periodWins"); winsBox.innerHTML = "";
  if (data.wins.length) {
    winsBox.className = "digest-list";
    data.wins.slice(0, 8).forEach(item => {
      const row = el("div"); const check = el("i"); check.textContent = "✓";
      const text = el("p"); text.append(document.createTextNode(item.text));
      const recordDate = el("small"); recordDate.textContent = item.date; text.append(recordDate);
      row.append(check, text); winsBox.append(row);
    });
    if (data.wins.length > 8) { const more = el("p", "more-note"); more.textContent = `还有 ${data.wins.length - 8} 项已计入复制内容`; winsBox.append(more); }
  } else renderEmpty(winsBox, "○", "这个周期还没有完成事项", "从每日记录开始，成果会自动汇聚到这里。");

  const progressBox = $("#periodProgress"); progressBox.innerHTML = "";
  if (data.progress.length) {
    progressBox.className = "progress-list";
    data.progress.slice(0, 4).forEach(item => {
      const row = el("div"); const recordDate = el("time"); recordDate.textContent = item.date;
      const text = el("p"); text.textContent = item.text; row.append(recordDate, text); progressBox.append(row);
    });
    if (data.progress.length > 4) { const more = el("p", "more-note"); more.textContent = "更多进展会保留在复制的总结中"; progressBox.append(more); }
  } else renderEmpty(progressBox, "◇", "暂时没有进展摘要", "填写每日“进展与产出”后会自动显示。");

  document.querySelectorAll("[data-summary-field]").forEach(input => { input.value = data.summary[input.dataset.summaryField] || ""; });
}

function shiftPeriod(delta) {
  const next = new Date(summaryAnchor + "T12:00:00");
  if (summaryType === "week") next.setDate(next.getDate() + delta * 7);
  if (summaryType === "month") next.setMonth(next.getMonth() + delta);
  if (summaryType === "quarter") next.setMonth(next.getMonth() + delta * 3);
  if (summaryType === "year") next.setFullYear(next.getFullYear() + delta);
  summaryAnchor = key(next);
  renderPeriod();
}

function render() {
  const display = new Date(date + "T12:00:00");
  const entry = current();
  $("#dateInput").value = date;
  $("#dateText").textContent = date;
  $("#displayDate").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(display);
  $("#tomorrowDate").textContent = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(move(date, 1) + "T12:00:00"));
  $("#todayBtn").style.display = date === key(new Date()) ? "none" : "block";
  bindText("#progress", "progress"); bindText("#blockers", "blockers"); bindText("#learnings", "learnings");
  renderList("wins", "#winsList", "task"); renderList("tomorrow", "#plansList", "plan");
  $("#focus").value = entry.focus; $("#focusValue").textContent = entry.focus + "/10";
  [...$("#moods").children].forEach((button, index) => button.classList.toggle("selected", entry.mood === index + 1));
  renderYesterday(); renderStats(); renderPeriod();
}

$("#prevDay").onclick = () => { date = move(date, -1); render(); };
$("#nextDay").onclick = () => { date = move(date, 1); render(); };
$("#todayBtn").onclick = () => { date = key(new Date()); render(); };
$("#dateInput").onchange = event => { date = event.target.value; render(); };
document.querySelectorAll("[data-add]").forEach(button => button.onclick = () => { current()[button.dataset.add].push(""); render(); save(); });
$("#focus").oninput = event => { current().focus = Number(event.target.value); $("#focusValue").textContent = event.target.value + "/10"; renderStats(); renderPeriod(); save(); };
[...$("#moods").children].forEach((button, index) => button.onclick = () => { current().mood = index + 1; render(); save(); });

$("#copyBtn").onclick = async () => {
  const entry = current();
  const items = values => values.filter(Boolean).map((value, index) => `${index + 1}. ${value}`).join("\n") || "暂无";
  await copyText(`【${date} 工作日报】\n\n今日完成：\n${items(entry.wins)}\n\n进展与产出：\n${entry.progress || "暂无"}\n\n问题与思考：\n${entry.blockers || "暂无"}\n\n今日收获：\n${entry.learnings || "暂无"}\n\n明日计划：\n${items(entry.tomorrow)}`);
  showToast("日报已复制");
};

document.querySelectorAll("[data-summary-type]").forEach(button => button.onclick = () => { summaryType = button.dataset.summaryType; renderPeriod(); });
$("#prevPeriod").onclick = () => shiftPeriod(-1);
$("#nextPeriod").onclick = () => shiftPeriod(1);
$("#currentPeriod").onclick = () => { summaryAnchor = key(new Date()); renderPeriod(); };
document.querySelectorAll("[data-summary-field]").forEach(input => input.oninput = () => {
  const data = periodData();
  periodSummaries[data.period.storageKey] = { ...data.summary, [input.dataset.summaryField]: input.value };
  localStorage.setItem("daymark-period-summaries", JSON.stringify(periodSummaries));
});
$("#copySummaryBtn").onclick = async () => {
  const data = periodData();
  const list = items => items.map((item, index) => `${index + 1}. ${item.text}`).join("\n") || "暂无";
  const text = `【${data.period.label} ${summaryLabels[summaryType]}】\n\n数据概览：记录 ${data.records.length} 天｜完成 ${data.wins.length} 项｜平均专注度 ${data.averageFocus}/10｜计划 ${data.plans} 项\n\n完成事项：\n${list(data.wins)}\n\n进展摘录：\n${list(data.progress)}\n\n关键成果：\n${data.summary.achievements || "暂无"}\n\n经验与成长：\n${data.summary.growth || "暂无"}\n\n问题与改进：\n${data.summary.challenges || "暂无"}\n\n下一阶段重点：\n${data.summary.nextFocus || "暂无"}`;
  await copyText(text);
  showToast("本期总结已复制");
};

$("#quoteBtn").onclick = randomQuote;
$("#addQuoteBtn").onclick = () => { $("#quoteModal").hidden = false; setTimeout(() => $("#newQuoteInput").focus(), 0); };
$("#closeQuoteBtn").onclick = closeQuoteEditor;
$("#cancelQuoteBtn").onclick = closeQuoteEditor;
$("#quoteModal").onclick = event => { if (event.target === $("#quoteModal")) closeQuoteEditor(); };
$("#newQuoteInput").oninput = event => { $("#quoteLength").textContent = event.target.value.length; $("#saveQuoteBtn").disabled = !event.target.value.trim(); };
$("#newQuoteInput").onkeydown = event => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) saveCustomQuote(); };
$("#saveQuoteBtn").onclick = saveCustomQuote;

randomQuote();
render();
