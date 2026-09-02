import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as schema from "@/db/schema";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../src/db/migrations");

/**
 * ฐานข้อมูลสำหรับเทสต์ — Postgres จริงคอมไพล์เป็น WASM ไม่ต้องมี Docker หรือ DB บนเครื่อง
 *
 * รันไฟล์ migration ชุดเดียวกับ production ตามลำดับใน _journal.json
 * ดังนั้น migration ที่เขียนผิดจะทำให้ integration test พังทันที ไม่ต้องรอไปเจอตอน deploy
 */
export async function createTestDb() {
  const client = new PGlite({ extensions: { pg_trgm } });

  // ของจริงมี auth.users มาจาก Supabase — ที่นี่ต้องสร้าง stub ก่อน ไม่งั้น FK ใน 0001 พัง
  await client.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY,
      email text
    );
  `);

  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };

  for (const entry of journal.entries) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  return drizzle(client, { schema });
}

/** สร้างผู้ใช้ใน stub ของ auth.users แล้วคืน id — ใช้เป็นเจ้าของข้อมูลในเทสต์ */
export async function createTestUser(
  db: Awaited<ReturnType<typeof createTestDb>>,
  email = "tester@bodymefit.app",
) {
  const id = crypto.randomUUID();
  await db.$client.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, email]);
  return id;
}

/** เวลาไทยแบบเขียนอ่านง่ายในเทสต์ — thaiTime("2026-09-02 00:30") */
export function thaiTime(local: string): Date {
  const [datePart, timePart = "00:00"] = local.split(" ");
  return new Date(`${datePart}T${timePart}:00+07:00`);
}
