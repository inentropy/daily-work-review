"use client";

import { FormEvent, useState } from "react";
import { CURRENT_VERSION_LABEL } from "@/lib/changelog";

type FeedbackPanelProps = {
  userEmail?: string;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

const FEEDBACK_ENDPOINT =
  "https://formsubmit.co/ajax/zerobrilliant@gmail.com";

const FEEDBACK_TYPES = [
  { value: "功能建议", label: "功能建议", hint: "希望日迹增加什么能力" },
  { value: "问题反馈", label: "问题反馈", hint: "哪里没有按预期工作" },
  { value: "体验优化", label: "体验优化", hint: "哪里可以用得更舒服" },
  { value: "其他留言", label: "其他留言", hint: "任何想对开发者说的话" },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];

export function FeedbackPanel({ userEmail = "" }: FeedbackPanelProps) {
  const [type, setType] = useState<FeedbackType>(FEEDBACK_TYPES[0].value);
  const [contact, setContact] = useState(userEmail);
  const [message, setMessage] = useState("");
  const [honey, setHoney] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const selectedType = FEEDBACK_TYPES.find((item) => item.value === type);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedMessage = message.trim();
    if (honey || normalizedMessage.length < 8) return;

    setSubmitState("submitting");

    const formData = new FormData();
    formData.append("_subject", `日迹用户反馈｜${type}`);
    formData.append("_template", "table");
    formData.append("_honey", honey);
    formData.append("反馈类型", type);
    formData.append("留言内容", normalizedMessage);
    formData.append("联系方式", contact.trim() || "未填写");
    formData.append("登录账号", userEmail || "未知");
    formData.append("产品版本", CURRENT_VERSION_LABEL);
    formData.append("来源页面", window.location.href);

    try {
      const response = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      const result = (await response.json().catch(() => null)) as {
        success?: boolean | string;
      } | null;
      const rejected =
        result?.success === false || result?.success === "false";

      if (!response.ok || rejected) {
        throw new Error("feedback request failed");
      }

      setMessage("");
      setSubmitState("success");
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <section className="feedback-section" id="feedback">
      <div className="feedback-intro">
        <div>
          <p className="eyebrow">OPEN CHANNEL</p>
          <h2>有想法，<em>就告诉我。</em></h2>
          <p className="feedback-lead">
            功能建议、使用问题或一句真实感受，都会帮助日迹变得更好。
          </p>
        </div>
        <div className="feedback-destination">
          <span aria-hidden="true">↗</span>
          <div>
            <small>留言将发送至</small>
            <strong>zerobrilliant@gmail.com</strong>
          </div>
        </div>
      </div>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="feedback-heading">
          <div>
            <p>LEAVE A NOTE</p>
            <h3>留言反馈</h3>
          </div>
          <span>Alpha 通道</span>
        </div>

        <label className="feedback-field">
          <span>反馈类型</span>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as FeedbackType);
              setSubmitState("idle");
            }}
          >
            {FEEDBACK_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <small>{selectedType?.hint}</small>
        </label>

        <label className="feedback-field">
          <span>联系邮箱 <small>选填</small></span>
          <input
            type="email"
            value={contact}
            onChange={(event) => {
              setContact(event.target.value);
              setSubmitState("idle");
            }}
            placeholder="方便开发者回复你"
            autoComplete="email"
          />
        </label>

        <label className="feedback-field feedback-message">
          <span>想说的话</span>
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setSubmitState("idle");
            }}
            placeholder="请尽量描述具体场景，例如你正在做什么、遇到了什么、希望怎样改进……"
            minLength={8}
            maxLength={1000}
            required
          />
          <small>{message.length}/1000 · 至少输入 8 个字</small>
        </label>

        <label className="feedback-honey" aria-hidden="true">
          <span>请勿填写</span>
          <input
            type="text"
            value={honey}
            onChange={(event) => setHoney(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>

        {submitState === "success" && (
          <div className="feedback-status success" role="status">
            <i>✓</i>
            <span>
              留言已提交。首次使用时，收件邮箱需要点击一次激活确认。
            </span>
          </div>
        )}

        {submitState === "error" && (
          <div className="feedback-status error" role="alert">
            <i>!</i>
            <span>暂时发送失败，请检查网络后重新提交。</span>
          </div>
        )}

        <div className="feedback-actions">
          <small>留言会通过邮件转发服务送达，不会公开展示。</small>
          <button
            type="submit"
            disabled={submitState === "submitting" || message.trim().length < 8}
          >
            {submitState === "submitting" ? "正在发送…" : "发送留言"}
            {submitState !== "submitting" && <b aria-hidden="true">→</b>}
          </button>
        </div>
      </form>
    </section>
  );
}
