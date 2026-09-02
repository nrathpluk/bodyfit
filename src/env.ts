import "server-only";

/**
 * ตรวจ env ตอน "เรียกครั้งแรก" ไม่ใช่ตอน import
 *
 * เหตุผล: `next build` ต้อง import ทุก route เพื่อวิเคราะห์ ถ้าโยน error ตอน import
 * แอปจะ build ไม่ผ่านบนเครื่องที่ไม่มี env จริง (เช่น CI ที่ไม่มี DATABASE_URL)
 * อย่าย้ายไปตรวจที่ระดับ top-level
 */
type ServerEnv = {
  DATABASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
};

let cached: ServerEnv | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`ไม่ได้ตั้งค่า environment variable: ${name}`);
  return value;
}

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  cached = {
    DATABASE_URL: required("DATABASE_URL"),
    SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
    SUPABASE_PUBLISHABLE_KEY: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
  return cached;
}
