import { defineConfig } from "drizzle-kit";

/**
 * migration ต่อผ่าน DIRECT_URL (session pooler port 5432) ไม่ใช่ DATABASE_URL (6543)
 *
 * transaction pooler ของ Supabase ไม่รองรับ prepared statement และไม่การันตีว่า
 * ทุกคำสั่งใน migration เดียวกันจะวิ่งบน connection เดิม — DDL ยาว ๆ จึงพังกลางทาง
 * ส่วนตัวแอปยังใช้ 6543 เหมือนเดิม เพราะ serverless เปิด connection ถี่กว่ามาก
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // db:generate ไม่ใช้ค่านี้ จึงปล่อยว่างได้เวลาทำงานออฟไลน์
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
