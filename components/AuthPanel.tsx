"use client";

import { FormEvent, useState } from "react";
import { CURRENT_VERSION_LABEL } from "@/lib/changelog";
import { supabase } from "@/lib/supabase";

type AuthMode = "signIn" | "signUp";
type Feedback = {
  type: "error" | "success" | "info";
  text: string;
} | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authErrorMessage(message: string, mode: AuthMode) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "邮箱或密码不正确，请检查后重试。";
  }
  if (normalized.includes("email not confirmed")) {
    return "邮箱还没有完成验证，请先查看验证邮件。";
  }
  if (normalized.includes("user already registered")) {
    return "这个邮箱已经注册，可以直接登录。";
  }
  if (normalized.includes("password") && normalized.includes("least")) {
    return "密码强度不足，请设置至少 6 位密码。";
  }
  if (normalized.includes("rate limit")) {
    return "操作有些频繁，请稍后再试。";
  }

  return `${mode === "signIn" ? "登录" : "注册"}失败，请稍后重试。`;
}

export default function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "signUp";
  const hasConfirmation = confirmPassword.length > 0;
  const passwordsMatch = hasConfirmation && password === confirmPassword;
  const passwordLevel = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 6 ? 1 : 0;

  const changeMode = (nextMode: AuthMode) => {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setFeedback(null);
    setConfirmPassword("");
  };

  const validate = () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      return "请完整填写邮箱和密码。";
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return "请输入有效的邮箱地址。";
    }
    if (isRegister && password.length < 6) {
      return "密码至少需要 6 位。";
    }
    if (isRegister && !confirmPassword) {
      return "请再次输入密码进行确认。";
    }
    if (isRegister && password !== confirmPassword) {
      return "两次输入的密码不一致，请重新确认。";
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const validationError = validate();
    if (validationError) {
      setFeedback({ type: "error", text: validationError });
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setFeedback({ type: "error", text: authErrorMessage(error.message, mode) });
          return;
        }

        setFeedback({ type: "success", text: "登录成功，正在进入你的工作台…" });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setFeedback({ type: "error", text: authErrorMessage(error.message, mode) });
        return;
      }

      setFeedback({
        type: "success",
        text: "注册申请已提交，请打开邮箱完成账号验证。",
      });
      setConfirmPassword("");
    } catch {
      setFeedback({ type: "error", text: "网络连接失败，请检查网络后重试。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-layout" aria-label="日迹账号登录">
        <aside className="auth-intro">
          <div>
            <a className="auth-brand" href="#" aria-label="日迹首页">
              <span>✓</span>
              <strong>日迹</strong>
            </a>
            <p className="auth-eyebrow">DAILY WORK REVIEW</p>
            <h1>
              把每一天，
              <em>过得明白。</em>
            </h1>
            <p className="auth-lead">
              记录今天的行动，复盘昨天的得失，提前为明天留一盏灯。
            </p>
          </div>

          <div className="auth-benefits" aria-label="产品特点">
            <div><i>01</i><span><b>每日沉淀</b><small>工作记录与复盘清晰归档</small></span></div>
            <div><i>02</i><span><b>周期总结</b><small>周、月、季度和年度成果回顾</small></span></div>
            <div><i>03</i><span><b>云端同步</b><small>登录后安全同步到你的账号</small></span></div>
          </div>

          <p className="auth-privacy"><span />你的记录仅对当前账号可见</p>
        </aside>

        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-heading">
              <p>{isRegister ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</p>
              <h2>{isRegister ? "创建你的日迹账号" : "欢迎回来"}</h2>
              <span>{isRegister ? "注册后即可开始记录并同步工作内容。" : "继续记录、复盘和规划你的每一天。"}</span>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="登录或注册">
              <button
                type="button"
                role="tab"
                aria-selected={!isRegister}
                className={!isRegister ? "active" : ""}
                onClick={() => changeMode("signIn")}
              >
                登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isRegister}
                className={isRegister ? "active" : ""}
                onClick={() => changeMode("signUp")}
              >
                注册账号
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label className="auth-field">
                <span>邮箱地址</span>
                <div className="auth-input-shell">
                  <i aria-hidden="true">@</i>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    aria-invalid={feedback?.type === "error" && !EMAIL_PATTERN.test(email.trim())}
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>密码</span>
                <div className="auth-input-shell">
                  <i aria-hidden="true">●</i>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    placeholder={isRegister ? "至少 6 位密码" : "请输入密码"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? "隐藏" : "显示"}
                  </button>
                </div>
                {isRegister && password.length > 0 && (
                  <span className="password-strength">
                    <i className={passwordLevel >= 1 ? "active" : ""} />
                    <i className={passwordLevel >= 2 ? "active" : ""} />
                    <i className={passwordLevel >= 3 ? "active" : ""} />
                    <small>{passwordLevel === 0 ? "至少需要 6 位" : passwordLevel === 1 ? "可用" : passwordLevel === 2 ? "良好" : "很强"}</small>
                  </span>
                )}
              </label>

              {isRegister && (
                <label className="auth-field auth-confirm-field">
                  <span>确认密码</span>
                  <div className={`auth-input-shell ${hasConfirmation ? (passwordsMatch ? "valid" : "invalid") : ""}`}>
                    <i aria-hidden="true">✓</i>
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="请再次输入密码"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={loading}
                      aria-invalid={hasConfirmation && !passwordsMatch}
                    />
                    {hasConfirmation && <b aria-hidden="true">{passwordsMatch ? "✓" : "!"}</b>}
                  </div>
                  {hasConfirmation && (
                    <small className={passwordsMatch ? "match" : "mismatch"}>
                      {passwordsMatch ? "两次密码输入一致" : "两次输入的密码不一致"}
                    </small>
                  )}
                </label>
              )}

              {feedback && (
                <div
                  className={`auth-feedback ${feedback.type}`}
                  role={feedback.type === "error" ? "alert" : "status"}
                  aria-live="polite"
                >
                  <i>{feedback.type === "error" ? "!" : feedback.type === "success" ? "✓" : "i"}</i>
                  <span>{feedback.text}</span>
                </div>
              )}

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading && <i aria-hidden="true" />}
                <span>{loading ? (isRegister ? "正在创建账号…" : "正在登录…") : (isRegister ? "创建账号" : "进入工作台")}</span>
                {!loading && <b aria-hidden="true">→</b>}
              </button>
            </form>

            <p className="auth-switch-note">
              {isRegister ? "已经有账号？" : "第一次使用日迹？"}
              <button type="button" onClick={() => changeMode(isRegister ? "signIn" : "signUp")} disabled={loading}>
                {isRegister ? "返回登录" : "免费注册"}
              </button>
            </p>
          </div>

          <p className="auth-footer">日迹 · 让认真工作的每一天都有迹可循 · {CURRENT_VERSION_LABEL}</p>
        </div>
      </section>
    </main>
  );
}
