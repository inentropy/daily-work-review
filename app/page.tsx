"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthPanel from "@/components/AuthPanel";
import { supabase } from "@/lib/supabase";

type Entry = {
  wins: string[];
  progress: string;
  blockers: string;
  learnings: string;
  tomorrow: string[];
  mood: number;
  focus: number;
};

type SummaryType = "week" | "month" | "quarter" | "year";

type PeriodSummary = {
  achievements: string;
  growth: string;
  challenges: string;
  nextFocus: string;
};

type PeriodInfo = {
  startKey: string;
  endKey: string;
  storageKey: string;
  label: string;
};

const emptyEntry = (): Entry => ({
  wins: [""], progress: "", blockers: "", learnings: "", tomorrow: [""], mood: 4, focus: 7,
});

const emptyPeriodSummary = (): PeriodSummary => ({ achievements: "", growth: "", challenges: "", nextFocus: "" });

const SUMMARY_TABS: { type: SummaryType; label: string; eyebrow: string }[] = [
  { type: "week", label: "周总结", eyebrow: "WEEKLY" },
  { type: "month", label: "月总结", eyebrow: "MONTHLY" },
  { type: "quarter", label: "季度总结", eyebrow: "QUARTERLY" },
  { type: "year", label: "年度总结", eyebrow: "YEARLY" },
];

const QUOTES = [
  "复盘不是回头看，而是为了走得更远。",
  "先完成，再完美。",
  "每天进步一点点，时间会给出答案。",
  "把重要的事，放在精力最好的时刻。",
  "真正的效率，是知道什么可以不做。",
  "清晰的计划，是行动最好的起点。",
  "今天的积累，会成为明天的底气。",
  "专注当下，结果会在路上出现。",
  "困难不是终点，而是需要调整方法的信号。",
  "完成一件重要的事，胜过忙完十件琐事。",
  "记录让努力有迹可循，复盘让经验可以复用。",
  "给明天留好方向，也给今天留一点余地。",
];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const moveDay = (date: string, delta: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + delta); return keyOf(d); };
const readableDate = (date: Date) => new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);

const periodBounds = (anchor: string, type: SummaryType): PeriodInfo => {
  const source = new Date(`${anchor}T12:00:00`);
let start = new Date(source);
let end: Date;
let label: string;
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

  const startKey = keyOf(start);
  const endKey = keyOf(end);
  return { startKey, endKey, storageKey: `${type}:${startKey}`, label };
};

const hasEntryContent = (entry: Entry) => Boolean(
  entry.wins?.some(Boolean) || entry.progress?.trim() || entry.blockers?.trim() || entry.learnings?.trim() || entry.tomorrow?.some(Boolean),
);

const writeClipboard = async (text: string) => {
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => setTimeout(() => reject(new Error("clipboard timeout")), 600)),
    ]);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [date, setDate] = useState(keyOf(new Date()));
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [ready, setReady] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [customQuotes, setCustomQuotes] = useState<string[]>([]);
  const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
  const [newQuote, setNewQuote] = useState("");
  const [summaryType, setSummaryType] = useState<SummaryType>("week");
  const [summaryAnchor, setSummaryAnchor] = useState(keyOf(new Date()));
  const [periodSummaries, setPeriodSummaries] = useState<Record<string, PeriodSummary>>({});
  const allQuotes = useMemo(() => [...QUOTES, ...customQuotes], [customQuotes]);
  const entry = entries[date] || emptyEntry();
  const yesterday = entries[moveDay(date, -1)];
  const tomorrowKey = moveDay(date, 1);
// ① 检查 Supabase 登录状态
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null);
    setAuthLoading(false);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
    setAuthLoading(false);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
 /* eslint-disable react-hooks/set-state-in-effect */
useEffect(() => {
  if (!user) {
    setReady(false);
    setSyncReady(false);
    return;
  }

  let cancelled = false;

  const loadData = async () => {
    setReady(false);

    // 每个用户使用独立的本地缓存 key
    const entriesKey = `daymark-entries:${user.id}`;
    const summariesKey = `daymark-period-summaries:${user.id}`;
    const quotesKey = `daymark-custom-quotes:${user.id}`;

    // 安全读取 localStorage
    const readJson = <T,>(
      key: string,
      fallback: T,
    ): T => {
      try {
        const value = localStorage.getItem(key);

        if (!value) {
          return fallback;
        }

        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    };

    /*
     * 兼容你原来没有用户账号时保存的数据。
     *
     * daymark-legacy-migrated 用来防止：
     * 同一个浏览器登录第二个账号时，
     * 又把第一个账号的旧数据上传给第二个账号。
     */
    const legacyMigrated =
      localStorage.getItem(
        "daymark-legacy-migrated",
      ) === "1";

    const legacyEntries =
      legacyMigrated
        ? {}
        : readJson<Record<string, Entry>>(
            "daymark-entries",
            {},
          );

    const legacyPeriodSummaries =
      legacyMigrated
        ? {}
        : readJson<
            Record<string, PeriodSummary>
          >(
            "daymark-period-summaries",
            {},
          );

    const legacyCustomQuotes =
      legacyMigrated
        ? []
        : readJson<string[]>(
            "daymark-custom-quotes",
            [],
          );

    // 优先读取当前用户自己的本地缓存
    const localEntries =
      readJson<Record<string, Entry>>(
        entriesKey,
        legacyEntries,
      );

    const localPeriodSummaries =
      readJson<Record<string, PeriodSummary>>(
        summariesKey,
        legacyPeriodSummaries,
      );

    const localCustomQuotes =
      readJson<string[]>(
        quotesKey,
        legacyCustomQuotes,
      );

    // 查询当前登录用户的 Supabase 数据
    const { data, error } = await supabase
      .from("daymark_state")
      .select(
        "entries, period_summaries, custom_quotes",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (cancelled) {
      return;
    }

    // Supabase 查询失败：暂时使用本地数据
    if (error) {
      console.error(
        "加载 Supabase 数据失败：",
        error,
      );

      setEntries(localEntries);
      setPeriodSummaries(
        localPeriodSummaries,
      );
      setCustomQuotes(localCustomQuotes);

      setQuoteIndex(
        Math.floor(
          Math.random() * QUOTES.length,
        ),
      );

      setReady(true);
      return;
    }

    if (data) {
      /*
       * Supabase 已经有这个用户的数据：
       * 云端数据优先
       */

      const cloudEntries =
        (data.entries ??
          {}) as Record<string, Entry>;

      const cloudPeriodSummaries =
        (data.period_summaries ??
          {}) as Record<
          string,
          PeriodSummary
        >;

      const cloudCustomQuotes =
        (data.custom_quotes ??
          []) as string[];

      setEntries(cloudEntries);

      setPeriodSummaries(
        cloudPeriodSummaries,
      );

      setCustomQuotes(
        cloudCustomQuotes,
      );

      // 同时写入当前用户自己的本地缓存
      localStorage.setItem(
        entriesKey,
        JSON.stringify(cloudEntries),
      );

      localStorage.setItem(
        summariesKey,
        JSON.stringify(
          cloudPeriodSummaries,
        ),
      );

      localStorage.setItem(
        quotesKey,
        JSON.stringify(
          cloudCustomQuotes,
        ),
      );
      setSyncReady(true);
    } else {
      /*
       * Supabase 没有数据：
       *
       * 说明大概率是这个用户第一次登录。
       * 把以前 localStorage 里的数据上传到 Supabase。
       */

      const { error: uploadError } =
        await supabase
          .from("daymark_state")
          .upsert(
            {
              user_id: user.id,

              entries:
                localEntries,

              period_summaries:
                localPeriodSummaries,

              custom_quotes:
                localCustomQuotes,

              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            },
          );

      if (uploadError) {
        console.error(
          "首次迁移数据到 Supabase 失败：",
          uploadError,
        );
      } else {
        // 保存为当前用户自己的缓存
        localStorage.setItem(
          entriesKey,
          JSON.stringify(
            localEntries,
          ),
        );

        localStorage.setItem(
          summariesKey,
          JSON.stringify(
            localPeriodSummaries,
          ),
        );

        localStorage.setItem(
          quotesKey,
          JSON.stringify(
            localCustomQuotes,
          ),
        );

        /*
         * 标记旧的无账号 localStorage
         * 已经迁移过。
         */
        localStorage.setItem(
          "daymark-legacy-migrated",
          "1",
        );
        setSyncReady(true);
      }

      setEntries(localEntries);

      setPeriodSummaries(
        localPeriodSummaries,
      );

      setCustomQuotes(
        localCustomQuotes,
      );
    }

    setQuoteIndex(
      Math.floor(
        Math.random() * QUOTES.length,
      ),
    );

    setReady(true);
  };

  void loadData();

  return () => {
    cancelled = true;
  };
}, [user]);
/* eslint-enable react-hooks/set-state-in-effect */
useEffect(() => {
  if (!ready || !syncReady || !user) {
    return;
  }

  const timer = window.setTimeout(() => {
    const saveData = async () => {
      const entriesKey =
        `daymark-entries:${user.id}`;

      const summariesKey =
        `daymark-period-summaries:${user.id}`;

      const quotesKey =
        `daymark-custom-quotes:${user.id}`;

      // 保存当前用户的本地缓存
      localStorage.setItem(
        entriesKey,
        JSON.stringify(entries),
      );

      localStorage.setItem(
        summariesKey,
        JSON.stringify(periodSummaries),
      );

      localStorage.setItem(
        quotesKey,
        JSON.stringify(customQuotes),
      );

      // 保存到 Supabase 云端
      const { error } = await supabase
        .from("daymark_state")
        .upsert(
          {
            user_id: user.id,
            entries,
            period_summaries: periodSummaries,
            custom_quotes: customQuotes,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (error) {
        console.error(
          "保存到 Supabase 失败：",
          error,
        );
        return;
      }

      setSaved(true);
    };

    void saveData();
  }, 800);

  return () => {
    window.clearTimeout(timer);
  };
}, [
  entries,
  periodSummaries,
  customQuotes,
  ready,
  syncReady,
  user,
]);
  const nextQuote = () => setQuoteIndex(current => {
    if (allQuotes.length < 2) return current;
    let next = current;
    while (next === current) next = Math.floor(Math.random() * allQuotes.length);
    return next;
  });

  const addCustomQuote = () => {
    const value = newQuote.trim();
    if (!value) return;
    const next = [...customQuotes, value];
    setCustomQuotes(next);
    setQuoteIndex(QUOTES.length + next.length - 1);
    setNewQuote("");
    setQuoteEditorOpen(false);
  };

  useEffect(() => {
  if (!ready || !user) {
    return;
  }

  const timer = setTimeout(() => {
    const saveData = async () => {
      const entriesKey =
        `daymark-entries:${user.id}`;

      const summariesKey =
        `daymark-period-summaries:${user.id}`;

      const quotesKey =
        `daymark-custom-quotes:${user.id}`;

      // ① 保存到当前用户自己的 localStorage
      localStorage.setItem(
        entriesKey,
        JSON.stringify(entries),
      );

      localStorage.setItem(
        summariesKey,
        JSON.stringify(
          periodSummaries,
        ),
      );

      localStorage.setItem(
        quotesKey,
        JSON.stringify(
          customQuotes,
        ),
      );
localStorage.setItem(
  "daymark-legacy-migrated",
  "1",
);
      // ② 同时保存到 Supabase
      const { error } = await supabase
        .from("daymark_state")
        .upsert(
          {
            user_id: user.id,

            entries,

            period_summaries:
              periodSummaries,

            custom_quotes:
              customQuotes,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (error) {
        console.error(
          "保存到 Supabase 失败：",
          error,
        );

        return;
      }

      setSaved(true);
    };

    void saveData();
  }, 800);

  return () => {
    clearTimeout(timer);
  };
}, [
  entries,
  periodSummaries,
  customQuotes,
  ready,
  user,
]);

  const update = (patch: Partial<Entry>) => {
  setSaved(false);

  setEntries(prev => ({
    ...prev,
    [date]: {
      ...(prev[date] || emptyEntry()),
      ...patch
    }
  }));
};
  const updateList = (field: "wins" | "tomorrow", index: number, value: string) => {
    const next = [...entry[field]]; next[index] = value; update({ [field]: next });
  };
  const addItem = (field: "wins" | "tomorrow") => update({ [field]: [...entry[field], ""] });
  const removeItem = (field: "wins" | "tomorrow", index: number) => update({ [field]: entry[field].filter((_, i) => i !== index) });
  const doneCount = entry.wins.filter(Boolean).length;
  const plannedCount = entry.tomorrow.filter(Boolean).length;

  const period = useMemo(() => periodBounds(summaryAnchor, summaryType), [summaryAnchor, summaryType]);
  const periodRecords = useMemo(() => Object.entries(entries)
    .filter(([key, value]) => key >= period.startKey && key <= period.endKey && hasEntryContent(value))
    .sort(([a], [b]) => b.localeCompare(a)), [entries, period]);
  const periodWins = useMemo(() => periodRecords.flatMap(([recordDate, value]) =>
    value.wins.filter(Boolean).map(text => ({ date: recordDate, text }))), [periodRecords]);
  const periodProgress = useMemo(() => periodRecords
    .filter(([, value]) => value.progress.trim())
    .map(([recordDate, value]) => ({ date: recordDate, text: value.progress.trim() })), [periodRecords]);
  const periodPlans = periodRecords.reduce((count, [, value]) => count + value.tomorrow.filter(Boolean).length, 0);
  const averageFocus = periodRecords.length
    ? (periodRecords.reduce((sum, [, value]) => sum + (Number(value.focus) || 0), 0) / periodRecords.length).toFixed(1)
    : "—";
  const currentPeriodSummary = periodSummaries[period.storageKey] || emptyPeriodSummary();

  const updatePeriodSummary = (field: keyof PeriodSummary, value: string) => {
    setPeriodSummaries(previous => {
      const next = { ...previous, [period.storageKey]: { ...(previous[period.storageKey] || emptyPeriodSummary()), [field]: value } };
      return next;
    });
  };

  const shiftPeriod = (delta: number) => {
    const next = new Date(`${summaryAnchor}T12:00:00`);
    if (summaryType === "week") next.setDate(next.getDate() + delta * 7);
    if (summaryType === "month") next.setMonth(next.getMonth() + delta);
    if (summaryType === "quarter") next.setMonth(next.getMonth() + delta * 3);
    if (summaryType === "year") next.setFullYear(next.getFullYear() + delta);
    setSummaryAnchor(keyOf(next));
  };

  const displayDate = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(d);
  }, [date]);

  const copyReport = async () => {
    const text = `【${date} 工作日报】\n\n今日完成：\n${entry.wins.filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join("\n") || "暂无"}\n\n进展与产出：\n${entry.progress || "暂无"}\n\n问题与思考：\n${entry.blockers || "暂无"}\n\n今日收获：\n${entry.learnings || "暂无"}\n\n明日计划：\n${entry.tomorrow.filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join("\n") || "暂无"}`;
    await writeClipboard(text); setToast("日报已复制"); setTimeout(() => setToast(""), 1800);
  };

  const copyPeriodSummary = async () => {
    const list = (items: { text: string }[]) => items.map((item, index) => `${index + 1}. ${item.text}`).join("\n") || "暂无";
    const text = `【${period.label} ${SUMMARY_TABS.find(item => item.type === summaryType)?.label}】\n\n数据概览：记录 ${periodRecords.length} 天｜完成 ${periodWins.length} 项｜平均专注度 ${averageFocus}/10｜计划 ${periodPlans} 项\n\n完成事项：\n${list(periodWins)}\n\n进展摘录：\n${list(periodProgress)}\n\n关键成果：\n${currentPeriodSummary.achievements || "暂无"}\n\n经验与成长：\n${currentPeriodSummary.growth || "暂无"}\n\n问题与改进：\n${currentPeriodSummary.challenges || "暂无"}\n\n下一阶段重点：\n${currentPeriodSummary.nextFocus || "暂无"}`;
    await writeClipboard(text);
    setToast("本期总结已复制"); setTimeout(() => setToast(""), 1800);
  };

  const seed = () => update({
    wins: ["完成重点客户报价方案", "跟进东南亚项目技术参数", "整理本周询盘数据"],
    progress: "报价方案已完成初稿，关键产品参数已与技术部门确认。客户反馈积极，等待最终数量确认。",
    blockers: "部分海外认证资料仍需补齐；下一步提前建立资料清单，减少临时查找。",
    learnings: "重要任务尽量安排在上午，沟通类工作集中处理更高效。",
    tomorrow: ["确认客户最终采购数量", "完成英文报价单并发送", "更新客户跟进表"], mood: 4, focus: 8,
  });
if (authLoading) {
  return (
    <main style={{ padding: "40px" }}>
      正在检查登录状态...
    </main>
  );
}

if (!user) {
  return <AuthPanel />;
}

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">✓</span><span>日迹</span></a>
        <div className="top-actions">
          <button
              type="button"
              onClick={async () => {
                const {error} = await supabase.auth.signOut({
                  scope: "local",
                });

                if (error) {
                  console.error("退出登录失败：", error);
                }
              }}
          >
            退出登录
          </button>
          <span className={`save-state ${saved ? "" : "saving"}`}><i/>{saved ? "已自动保存" : "正在保存"}</span>
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
        <div className="quote"><span>今日一句</span><p>“{allQuotes[quoteIndex] || QUOTES[0]}”</p><div className="quote-actions"><button onClick={() => setQuoteEditorOpen(true)} aria-label="添加语录" title="添加语录">＋</button><button onClick={nextQuote} aria-label="换一句" title="换一句">↻</button></div></div>
      </section>

      <section className="workspace">
        <article className="panel yesterday">
          <div className="panel-head"><div className="number">01</div><div><p>LOOK BACK</p><h2>复盘昨天</h2></div><span className="tag">昨日回望</span></div>
          <div className="yesterday-card">
            <div className="yesterday-block-title">
              <span>昨天完成的工作</span>
              <b>{yesterday?.wins?.filter(Boolean).length || 0} 项</b>
            </div>
            {yesterday?.wins?.filter(Boolean).length ? (
              <div className="past-list">
                {yesterday.wins.filter(Boolean).map((x, i) => <div className="past-item" key={i}><span>✓</span><p>{x}</p></div>)}
              </div>
            ) : <p className="empty-past">昨天还没有记录已完成的工作。</p>}
            <div className="yesterday-summary">
              <span>昨天的进展摘要</span>
              <p>{yesterday?.progress || "暂无进展摘要。"}</p>
            </div>
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

      <section className="period-section" id="periodSummary">
        <div className="period-heading">
          <div><p className="eyebrow">LONG VIEW</p><h2>周期总结</h2><p>把零散的每日记录，整理成看得见的成长轨迹。</p></div>
          <div className="period-tabs" role="tablist" aria-label="总结周期">
            {SUMMARY_TABS.map(item => <button key={item.type} role="tab" aria-selected={summaryType === item.type} className={summaryType === item.type ? "active" : ""} onClick={() => setSummaryType(item.type)}><small>{item.eyebrow}</small>{item.label}</button>)}
          </div>
        </div>

        <div className="period-toolbar">
          <button onClick={() => shiftPeriod(-1)} aria-label="上一周期">←</button>
          <div><strong>{period.label}</strong><small>{period.startKey} — {period.endKey}</small></div>
          <button onClick={() => shiftPeriod(1)} aria-label="下一周期">→</button>
          <button className="current-period" onClick={() => setSummaryAnchor(keyOf(new Date()))}>回到本期</button>
        </div>

        <div className="period-metrics">
          <div><span>记录天数</span><strong>{periodRecords.length}</strong><small>留下工作记录的天数</small></div>
          <div><span>完成事项</span><strong>{periodWins.length}</strong><small>本期已完成的工作</small></div>
          <div><span>平均专注度</span><strong>{averageFocus}<b>{averageFocus === "—" ? "" : "/10"}</b></strong><small>有记录日期的平均值</small></div>
          <div><span>计划事项</span><strong>{periodPlans}</strong><small>为下一步预设的任务</small></div>
        </div>

        <div className="period-digest">
          <article>
            <div className="digest-head"><div><p>ACHIEVEMENTS</p><h3>完成工作汇总</h3></div><span>{periodWins.length} 项</span></div>
            {periodWins.length ? <div className="digest-list">{periodWins.slice(0, 8).map((item, index) => <div key={`${item.date}-${index}`}><i>✓</i><p>{item.text}<small>{item.date}</small></p></div>)}{periodWins.length > 8 && <p className="more-note">还有 {periodWins.length - 8} 项已计入复制内容</p>}</div> : <div className="period-empty"><span>○</span><p>这个周期还没有完成事项<br/><small>从每日记录开始，成果会自动汇聚到这里。</small></p></div>}
          </article>
          <article>
            <div className="digest-head"><div><p>PROGRESS</p><h3>进展摘录</h3></div><span>{periodProgress.length} 条</span></div>
            {periodProgress.length ? <div className="progress-list">{periodProgress.slice(0, 4).map((item, index) => <div key={`${item.date}-${index}`}><time>{item.date}</time><p>{item.text}</p></div>)}{periodProgress.length > 4 && <p className="more-note">更多进展会保留在复制的总结中</p>}</div> : <div className="period-empty"><span>◇</span><p>暂时没有进展摘要<br/><small>填写每日“进展与产出”后会自动显示。</small></p></div>}
          </article>
        </div>

        <div className="reflection-head"><div><p>PERSONAL REVIEW</p><h3>写下这一阶段真正值得留下的东西</h3></div><span>以下内容按周期自动保存</span></div>
        <div className="reflection-grid">
          <label><span><b>01</b>关键成果</span><small>最有价值的结果、数据或突破</small><textarea value={currentPeriodSummary.achievements} onChange={event => updatePeriodSummary("achievements", event.target.value)} placeholder="这一阶段最值得肯定的成果是……" /></label>
          <label><span><b>02</b>经验与成长</span><small>有效方法、能力提升和新认知</small><textarea value={currentPeriodSummary.growth} onChange={event => updatePeriodSummary("growth", event.target.value)} placeholder="哪些方法值得继续复用……" /></label>
          <label><span><b>03</b>问题与改进</span><small>阻碍、偏差和下次的调整方式</small><textarea value={currentPeriodSummary.challenges} onChange={event => updatePeriodSummary("challenges", event.target.value)} placeholder="哪里可以做得更好……" /></label>
          <label><span><b>04</b>下一阶段重点</span><small>最重要的目标和行动方向</small><textarea value={currentPeriodSummary.nextFocus} onChange={event => updatePeriodSummary("nextFocus", event.target.value)} placeholder="下一阶段优先推进……" /></label>
        </div>
        <div className="period-actions"><span><i /> 已自动保存到当前浏览器</span><button onClick={copyPeriodSummary}>复制本期总结</button></div>
      </section>
      <footer><span>日迹 · 让工作留下清晰的脉络</span><span>数据仅保存在你的浏览器中</span></footer>
      {toast && <div className="toast">✓ {toast}</div>}
      {quoteEditorOpen && <div className="modal-backdrop" onMouseDown={() => setQuoteEditorOpen(false)}>
        <div className="quote-editor" role="dialog" aria-modal="true" aria-labelledby="quoteEditorTitle" onMouseDown={e => e.stopPropagation()}>
          <div className="editor-head"><div><p>MY QUOTE</p><h3 id="quoteEditorTitle">添加自己的语录</h3></div><button onClick={() => setQuoteEditorOpen(false)} aria-label="关闭">×</button></div>
          <textarea autoFocus maxLength={120} value={newQuote} onChange={e => setNewQuote(e.target.value)} placeholder="写下一句想提醒自己的话……" onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addCustomQuote(); }} />
          <div className="editor-foot"><small>{newQuote.length}/120 · Ctrl + Enter 保存</small><div><button className="cancel" onClick={() => setQuoteEditorOpen(false)}>取消</button><button className="save-quote" onClick={addCustomQuote} disabled={!newQuote.trim()}>保存语录</button></div></div>
        </div>
      </div>}
    </main>
  );
}
