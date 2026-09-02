import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/env";

/** client ฝั่งเซิร์ฟเวอร์ที่อ่าน/ต่ออายุ session จาก cookie */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const env = serverEnv();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component เขียน cookie ไม่ได้ — ปล่อยผ่าน เพราะ proxy.ts
          // ต่ออายุ token ให้ในทุก request อยู่แล้ว (ดู src/proxy.ts)
        }
      },
    },
  });
}
