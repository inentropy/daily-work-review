"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import AuthPanel from "@/components/AuthPanel";
import { FeedbackPanel } from "@/components/FeedbackPanel";
import { CURRENT_VERSION_LABEL } from "@/lib/changelog";
import { supabase } from "@/lib/supabase";

export default function FeedbackPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <main className="auth-check-shell">
        <div className="auth-check-card" role="status" aria-live="polite">
          <span className="brand-mark">✓</span>
          <div>
            <strong>日迹</strong>
            <small>正在检查登录状态…</small>
          </div>
          <i aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (!user) return <AuthPanel />;

  return (
    <main className="feedback-page">
      <header className="feedback-page-header">
        <Link href="/" className="feedback-page-brand">
          <span className="brand-mark">✓</span>
          <span>日迹</span>
        </Link>
        <div>
          <span>{CURRENT_VERSION_LABEL}</span>
          <Link href="/">← 返回工作台</Link>
        </div>
      </header>

      <div className="feedback-page-title">
        <p>FEEDBACK STUDIO</p>
        <h1>
          留下一条反馈，<em>一起把日迹做得更好。</em>
        </h1>
        <span>你的每一条建议都会直接送达开发者邮箱。</span>
      </div>

      <FeedbackPanel userEmail={user.email} />
    </main>
  );
}
