"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  wins: string[];
  progress: string;
  blockers: string;
  learnings: string;
  tomorrow: string[];
  mood: number;
  focus: number;
};

const emptyEntry = (): Entry => ({
  wins: [""], progress: "", blockers: "", learnings: "", tomorrow: [""], mood: 4, focus: 7,
});

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const moveDay = (date: string, delta: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + delta); return keyOf(d); };

export default function Home() {
  const [date, setDate] = useState(keyOf(new Date()));
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const entry = entries[date] || emptyEntry();
  const yesterday = entries[moveDay(date, -1)];
  const tomorrowKey = moveDay(date, 1);

  useEffect(() => {
    try { setEntries(JSON.parse(localStorage.getItem("daymark-entries") || "{}")); } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaved(false);
    const timer = setTimeout(() => { localStorage.setItem("daymark-entries", JSON.stringify(entries)); setSaved(true); }, 450);
    return () => clearTimeout(timer);
  }, [entries, ready]);

  const update = (patch: Partial<Entry>) => setEntries(prev => ({ ...prev, [date]: { ...(prev[date] || emptyEntry()), ...patch } }));
  const updateList = (field: "wins" | "tomorrow", index: number, value: string) => {
    const next = [...entry[field]]; next[index] = value; update({ [field]: next });
  };
  const addItem = (field: "wins" | "tomorrow") => update({ [field]: [...entry[field], ""] });
  const removeItem = (field: "wins" | "tomorrow", index: number) => update({ [field]: entry[field].filter((_, i) => i !== index) });
  const doneCount = entry.wins.filter(Boolean).length;
  const plannedCount = entry.tomorrow.filter(Boolean).length;

  const displayDate = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(d);
  }, [date]);

  const copyReport = async () => {
    const text = `【${date} 工作日报】\n\n今日完成：\n${entry.wins.filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join("\n") || "暂无"}\n\n进展与产出：\n${entry.progress || "暂无"}\n\n问题与思考：\n${entry.blockers || "暂无"}\n\n今日收获：\n${entry.learnings || "暂无"}\n\n明日计划：\n${entry.tomorrow.filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join("\n") || "暂无"}`;
    await navigator.clipboard.writeText(text); setToast("日报已复制"); setTimeout(() => setToast(""), 1800);
  };

  const seed = () => update({
    wins: ["完成重点客户报价方案", "跟进东南亚项目技术参数", "整理本周询盘数据"],
    progress: "报价方案已完成初稿，关键产品参数已与技术部门确认。客户反馈积极，等待最终数量确认。",
    blockers: "部分海外认证资料仍需补齐；下一步提前建立资料清单，减少临时查找。",
    learnings: "重要任务尽量安排在上午，沟通类工作集中处理更高效。",
    tomorrow: ["确认客户最终采购数量", "完成英文报价单并发送", "更新客户跟进表"], mood: 4, focus: 8,
  });

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">✓</span><span>日迹</span></a>
        <div className="top-actions">
          <span className={`save-state ${saved ? "" : "saving"}`}><i />{saved ? "已自动保存" : "正在保存"}</span>
          <button className="ghost-btn" onClick={copyReport}>复制日报</button>
          <button className="avatar" aria-label="个人中心">工</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">DAILY WORK REVIEW</p>
          <h1>把每一天，<em>过得明白。</em></h1>
          <p className="subtitle">记录今天的行动，复盘昨天的得失，为明天留一盏灯。</p>
        </div>
        <div className="date-control">
          <button onClick={() => setDate(moveDay(date, -1))} aria-label="前一天">←</button>
          <label><span>{displayDate}</span><small>{date}</small><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <button onClick={() => setDate(moveDay(date, 1))} aria-label="后一天">→</button>
          {date !== keyOf(new Date()) && <button className="today-btn" onClick={() => setDate(keyOf(new Date()))}>回到今天</button>}
        </div>
      </section>

      <section className="stats">
        <div><span>今日完成</span><strong>{doneCount}</strong><small>件重要事项</small></div>
        <div><span>专注状态</span><strong>{entry.focus}<b>/10</b></strong><small>{entry.focus >= 8 ? "状态很棒" : entry.focus >= 6 ? "稳步推进" : "注意休息"}</small></div>
        <div><span>明日预设</span><strong>{plannedCount}</strong><small>项优先任务</small></div>
        <div className="quote"><span>今日一句</span><p>“复盘不是回头看，<br/>而是为了走得更远。”</p></div>
      </section>

      <section className="workspace">
        <article className="panel yesterday">
          <div className="panel-head"><div className="number">01</div><div><p>LOOK BACK</p><h2>复盘昨天</h2></div><span className="tag">昨日回望</span></div>
          <div className="yesterday-card">
            <p>{yesterday?.progress || "昨天还没有留下记录。写下今天的内容后，明天再回来看看。"}</p>
            {yesterday?.wins?.filter(Boolean).slice(0, 3).map((x, i) => <div className="past-item" key={i}><span>✓</span>{x}</div>)}
          </div>
          <label className="field-label">昨天最值得复用的经验</label>
          <textarea value={entry.learnings} onChange={e => update({ learnings: e.target.value })} placeholder="哪些做法有效？哪些经验值得带到今天……" />
          <label className="field-label">遇到的问题与改进</label>
          <textarea value={entry.blockers} onChange={e => update({ blockers: e.target.value })} placeholder="哪里卡住了？下一次可以如何做得更好……" />
        </article>

        <article className="panel today">
          <div className="panel-head"><div className="number">02</div><div><p>CAPTURE TODAY</p><h2>总结今天</h2></div><span className="tag active">正在记录</span></div>
          <label className="field-label">今日完成</label>
          <div className="task-list">{entry.wins.map((item, i) => <div className="task" key={i}><span className={item ? "checked" : ""}>{item ? "✓" : i + 1}</span><input value={item} onChange={e => updateList("wins", i, e.target.value)} placeholder="我今天完成了什么？"/><button onClick={() => removeItem("wins", i)}>×</button></div>)}</div>
          <button className="add-btn" onClick={() => addItem("wins")}>＋ 添加一项完成</button>
          <label className="field-label">进展与产出</label>
          <textarea className="large" value={entry.progress} onChange={e => update({ progress: e.target.value })} placeholder="记录关键进展、数据、成果，或值得分享的细节……" />
          <div className="sliders">
            <label><span>今日心情</span><div className="moods">{["😣","😕","😐","🙂","😊"].map((m, i) => <button key={m} className={entry.mood === i + 1 ? "selected" : ""} onClick={() => update({ mood: i + 1 })}>{m}</button>)}</div></label>
            <label><span>专注程度 <b>{entry.focus}/10</b></span><input type="range" min="1" max="10" value={entry.focus} onChange={e => update({ focus: Number(e.target.value) })}/></label>
          </div>
        </article>

        <article className="panel tomorrow">
          <div className="panel-head"><div className="number">03</div><div><p>PLAN AHEAD</p><h2>预设明天</h2></div><span className="tag">提前一步</span></div>
          <div className="tomorrow-date"><span>明日</span><strong>{new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${tomorrowKey}T12:00:00`))}</strong></div>
          <label className="field-label">最重要的三件事</label>
          <div className="plan-list">{entry.tomorrow.map((item, i) => <div className="plan" key={i}><span>{pad(i + 1)}</span><input value={item} onChange={e => updateList("tomorrow", i, e.target.value)} placeholder={i === 0 ? "明天最重要的事情是……" : "接下来要推进……"}/><button onClick={() => removeItem("tomorrow", i)}>×</button></div>)}</div>
          <button className="add-btn dark" onClick={() => addItem("tomorrow")}>＋ 添加一项计划</button>
          <div className="focus-note"><span>✦</span><div><strong>给明天的提醒</strong><p>优先完成第一件事，再打开消息列表。给重要的事留出不被打扰的时间。</p></div></div>
          {!entry.progress && !entry.wins.some(Boolean) && <button className="example" onClick={seed}>填入示例，快速体验</button>}
        </article>
      </section>
      <footer><span>日迹 · 让工作留下清晰的脉络</span><span>数据仅保存在你的浏览器中</span></footer>
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}
