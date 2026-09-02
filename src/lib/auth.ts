import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase/server";

/**
 * ผู้ใช้ปัจจุบัน หรือ null
 *
 * ใช้ getUser() ไม่ใช่ getSession() — getSession() อ่าน JWT จาก cookie ตรง ๆ
 * โดยไม่ตรวจลายเซ็นกับเซิร์ฟเวอร์ ปลอมได้ ห้ามใช้ตัดสินใจเรื่องสิทธิ์
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** บังคับให้ล็อกอิน — ใช้ในทุกหน้า/ทุก route ที่แตะข้อมูลผู้ใช้ */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
