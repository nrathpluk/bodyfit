import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeInternalPath } from "@/lib/redirects";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * ปลายทางของลิงก์ยืนยันอีเมล — แลก token_hash เป็น session แล้วพาไปต่อ
 * ต้องเป็น route handler (ไม่ใช่ page) เพราะต้องเขียน cookie ของ session
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeInternalPath(searchParams.get("next") ?? undefined, "/onboarding");

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=ลิงก์ยืนยันไม่ถูกต้อง", request.url));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=ลิงก์ยืนยันหมดอายุแล้ว", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
