import "server-only";

/**
 * ตรวจ env ตอน "อ่านค่าจริง" ไม่ใช่ตอน import และไม่ใช่ตอนเรียก serverEnv()
 *
 * เหตุผลที่ต้อง lazy: `next build` ต้อง import ทุก route เพื่อวิเคราะห์
 * ถ้าโยน error ตอน import แอปจะ build ไม่ผ่านบนเครื่องที่ไม่มี env จริง (เช่น CI)
 *
 * เหตุผลที่ต้องแยกทีละตัว (ไม่ใช่ตรวจครบทุกตัวรวดเดียว): หน้าที่ใช้แค่ auth
 * ไม่ควรพังเพราะยังไม่ได้ตั้ง DATABASE_URL — ให้แต่ละส่วนพังเฉพาะ env ที่ตัวเองใช้
 */
type ServerEnv = {
  readonly DATABASE_URL: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_PUBLISHABLE_KEY: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`ไม่ได้ตั้งค่า environment variable: ${name}`);
  return value;
}

const env: ServerEnv = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get SUPABASE_URL() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get SUPABASE_PUBLISHABLE_KEY() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
};

export function serverEnv(): ServerEnv {
  return env;
}
