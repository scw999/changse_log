"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function LoginForm({ nextPath = "/admin" }: Readonly<{ nextPath?: string }>) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      setMessage("Supabase 환경 변수가 아직 설정되지 않았습니다.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      setMessage("로그인 링크를 이메일로 보냈습니다. 메일함에서 확인해 주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인 링크 발송에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-stone-500">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="field"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-stone-900 px-5 py-3 text-sm text-white disabled:opacity-60"
      >
        {isSubmitting ? "링크를 보내는 중..." : "로그인 링크 보내기"}
      </button>

      {message ? <p className="text-sm leading-6 text-stone-600">{message}</p> : null}
    </form>
  );
}
