import { createBrowserClient } from "@supabase/ssr";

/**
 * client ฝั่งเบราว์เซอร์ — ใช้เฉพาะงาน auth (เข้าสู่ระบบ/สมัคร/ออกจากระบบ)
 *
 * ห้ามใช้อ่านหรือเขียนตารางข้อมูล: ทุกตารางเปิด RLS แบบ deny-all
 * การอ่าน/เขียนข้อมูลทั้งหมดต้องผ่าน server (ดู CLAUDE.md)
 */
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("ไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_* สำหรับฝั่งเบราว์เซอร์");
  return createBrowserClient(url, key);
}
