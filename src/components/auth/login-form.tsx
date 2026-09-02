"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Alert, Button, Field, Input } from "@/components/ui";

type Mode = "signin" | "signup";

/**
 * ฟอร์มเข้าสู่ระบบ/สมัครสมาชิก
 *
 * งาน auth ทำฝั่งเบราว์เซอร์ด้วย supabase-js เพราะมันจัดการ cookie ของ session
 * และการต่ออายุ token ให้เอง ส่วนการอ่าน/เขียนข้อมูลทั้งหมดยังอยู่ฝั่ง server เหมือนเดิม
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const supabase = createBrowserSupabase();

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding` },
      });
      setPending(false);
      if (signUpError) return setError(translate(signUpError.message));
      // ถ้าโปรเจกต์เปิดให้ยืนยันอีเมล จะยังไม่มี session ตอนนี้
      if (!data.session) {
        return setNotice("ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว กดลิงก์ในอีเมลเพื่อเริ่มใช้งาน");
      }
      router.push("/onboarding");
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) return setError(translate(signInError.message));
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-1">
        <ModeTab active={mode === "signin"} onClick={() => setMode("signin")}>
          เข้าสู่ระบบ
        </ModeTab>
        <ModeTab active={mode === "signup"} onClick={() => setMode("signup")}>
          สมัครสมาชิก
        </ModeTab>
      </div>

      <Field label="อีเมล">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field label="รหัสผ่าน" hint={mode === "signup" ? "อย่างน้อย 8 ตัวอักษร" : undefined}>
        <Input
          type="password"
          name="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}

      <Button type="submit" disabled={pending}>
        {pending ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
      </Button>
    </form>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-lg text-sm font-medium transition ${
        active ? "bg-brand text-white" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** ข้อความ error ของ Supabase เป็นภาษาอังกฤษ — แปลเฉพาะเคสที่ผู้ใช้เจอบ่อย */
function translate(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    "Email not confirmed": "ยังไม่ได้ยืนยันอีเมล กรุณากดลิงก์ในอีเมลก่อน",
    "User already registered": "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน",
    "Password should be at least 6 characters.": "รหัสผ่านสั้นเกินไป",
  };
  return map[message] ?? message;
}
