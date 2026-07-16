"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 登录
  const signIn = async () => {
    setMessage("");

    if (!email || !password) {
      setMessage("请输入邮箱和密码。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(`登录失败：${error.message}`);
      return;
    }

    setMessage("登录成功。");
  };

  // 注册
  const signUp = async () => {
    setMessage("");

    if (!email || !password) {
      setMessage("请输入邮箱和密码。");
      return;
    }

    if (password.length < 6) {
      setMessage("密码至少需要 6 位。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(`注册失败：${error.message}`);
      return;
    }

    setMessage("注册成功，请打开邮箱完成账号验证。");
  };

  return (
    <main
      style={{
        maxWidth: "420px",
        margin: "100px auto",
        padding: "32px",
      }}
    >
      <h1>日迹 · 工作复盘</h1>

      <p>登录后，你的工作记录将可以同步到云端。</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "24px",
        }}
      >
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button
          type="button"
          onClick={signIn}
          disabled={loading}
        >
          {loading ? "处理中..." : "登录"}
        </button>

        <button
          type="button"
          onClick={signUp}
          disabled={loading}
        >
          注册账号
        </button>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}