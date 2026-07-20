import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type ReminderPreference = {
  user_id: string;
  email: string;
  reminder_times: string[];
  timezone: string;
};

type ReminderTask = {
  id?: string;
  text?: string;
  status?: string;
  carriedFrom?: string;
};

type DailyEntry = {
  tomorrow?: ReminderTask[];
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const REMINDER_FROM =
  Deno.env.get("REMINDER_FROM") ??
  "日迹 <reminder@daily-work-review.com>";

const localClock = (timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
};

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const minuteValue = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const isDue = (currentTime: string, reminderTime: string) => {
  const elapsed = minuteValue(currentTime) - minuteValue(reminderTime);
  return elapsed >= 0 && elapsed < 5;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );

const pendingTasksForDate = (
  entries: Record<string, DailyEntry>,
  localDate: string,
) => {
  const previousDate = shiftDate(localDate, -1);
  const plannedYesterday = entries[previousDate]?.tomorrow ?? [];
  const carriedToday = (entries[localDate]?.tomorrow ?? []).filter(
    (task) => task.carriedFrom === previousDate,
  );
  const latestById = new Map<string, ReminderTask>();

  for (const [index, task] of plannedYesterday.entries()) {
    latestById.set(task.id ?? `${previousDate}-${index}`, task);
  }

  for (const [index, task] of carriedToday.entries()) {
    latestById.set(task.id ?? `${localDate}-${index}`, task);
  }

  return [...latestById.values()]
    .filter(
      (task) =>
        typeof task.text === "string" &&
        task.text.trim() &&
        task.status !== "completed",
    )
    .map((task) => task.text!.trim());
};

const sendWorkReminders = {
  fetch: withSupabase(
    { auth: "secret" },
    async (_request, context) => {
      if (!RESEND_API_KEY) {
        return Response.json(
          { error: "RESEND_API_KEY is not configured" },
          { status: 500 },
        );
      }

      const { data: preferences, error: preferencesError } =
        await context.supabaseAdmin
          .from("reminder_preferences")
          .select("user_id, email, reminder_times, timezone")
          .eq("enabled", true);

      if (preferencesError) {
        console.error("Failed to load reminder preferences", preferencesError);
        return Response.json(
          { error: "Could not load reminder preferences" },
          { status: 500 },
        );
      }

      let sent = 0;
      let skipped = 0;
      let failed = 0;

      for (const preference of (preferences ?? []) as ReminderPreference[]) {
        const clock = localClock(preference.timezone);
        const dueTimes = preference.reminder_times.filter((time) =>
          isDue(clock.time, time),
        );

        for (const reminderTime of dueTimes) {
          const { data: delivery, error: deliveryError } =
            await context.supabaseAdmin
              .from("reminder_delivery_log")
              .insert({
                user_id: preference.user_id,
                reminder_date: clock.date,
                reminder_time: reminderTime,
                status: "processing",
              })
              .select("id")
              .single();

          if (deliveryError?.code === "23505") {
            skipped += 1;
            continue;
          }

          if (deliveryError || !delivery) {
            failed += 1;
            console.error("Could not reserve reminder delivery", deliveryError);
            continue;
          }

          const { data: state, error: stateError } =
            await context.supabaseAdmin
              .from("daymark_state")
              .select("entries")
              .eq("user_id", preference.user_id)
              .maybeSingle();

          const tasks = stateError
            ? []
            : pendingTasksForDate(
                (state?.entries ?? {}) as Record<string, DailyEntry>,
                clock.date,
              );

          if (stateError || tasks.length === 0) {
            await context.supabaseAdmin
              .from("reminder_delivery_log")
              .update({
                status: stateError ? "failed" : "skipped",
                error_message: stateError?.message ?? null,
              })
              .eq("id", delivery.id);
            if (stateError) {
              failed += 1;
            } else {
              skipped += 1;
            }
            continue;
          }

          const taskList = tasks
            .map(
              (task) =>
                `<li style="margin:0 0 10px;line-height:1.7">${escapeHtml(task)}</li>`,
            )
            .join("");
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: REMINDER_FROM,
              to: [preference.email],
              subject: `日迹提醒：还有 ${tasks.length} 项工作等待推进`,
              html: `
                <div style="max-width:620px;margin:auto;padding:32px;font-family:Arial,'Microsoft YaHei',sans-serif;color:#1e2d28">
                  <p style="color:#1f6a4c;font-size:12px;font-weight:700;letter-spacing:.12em">DAILY WORK REVIEW</p>
                  <h1 style="font-size:26px;margin:8px 0 14px">为今天留一条清晰的行动线。</h1>
                  <p style="color:#67746d;line-height:1.8">你为今天安排的事项中，还有 ${tasks.length} 项尚未完成：</p>
                  <ol style="padding-left:22px">${taskList}</ol>
                  <a href="https://www.daily-work-review.com" style="display:inline-block;margin-top:16px;padding:11px 18px;border-radius:999px;background:#1f6a4c;color:#fff;text-decoration:none;font-weight:700">打开日迹更新状态</a>
                  <p style="margin-top:26px;color:#98a19d;font-size:12px;line-height:1.7">你可以在“预设明天 → 明日邮件提醒”中修改时间或关闭提醒。</p>
                </div>
              `,
            }),
          });

          const responseBody = await response.text();

          if (!response.ok) {
            failed += 1;
            console.error("Resend delivery failed", response.status, responseBody);
            await context.supabaseAdmin
              .from("reminder_delivery_log")
              .update({
                status: "failed",
                task_count: tasks.length,
                error_message: `Resend HTTP ${response.status}`,
              })
              .eq("id", delivery.id);
            continue;
          }

          sent += 1;
          await context.supabaseAdmin
            .from("reminder_delivery_log")
            .update({
              status: "sent",
              task_count: tasks.length,
              sent_at: new Date().toISOString(),
            })
            .eq("id", delivery.id);
        }
      }

      return Response.json({ sent, skipped, failed });
    },
  ),
};

export default sendWorkReminders;
