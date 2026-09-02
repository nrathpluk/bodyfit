// ตรวจว่า DATABASE_URL ใน .env.local ต่อฐานข้อมูลได้จริง ผ่าน pooler ตัวเดียวกับที่แอปใช้
// รันด้วย: npm run db:check
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const [{ now }] = await sql`SELECT now()`;
const tables = await sql`
  SELECT c.relname AS name, c.relrowsecurity AS rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname`;
console.log("ต่อฐานข้อมูลผ่าน transaction pooler สำเร็จ");
console.log("เวลาบนเซิร์ฟเวอร์:", now.toISOString());
console.log("ตาราง:", tables.map((t) => `${t.name}${t.rls ? " (RLS)" : ""}`).join(", "));
await sql.end();
