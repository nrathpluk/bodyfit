import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { weightLogs } from "@/db/schema";
import { addDays, today, type DateString } from "./dates";
import { withTrend, type TrendPoint } from "./weight";

export type WeightLog = typeof weightLogs.$inferSelect;

/** บันทึกน้ำหนักของวัน — ชั่งซ้ำวันเดิมคือทับค่าเดิม ไม่ใช่เพิ่มแถว */
export async function logWeight(
  userId: string,
  input: { logDate: DateString; weightKg: number; bodyFatPct?: number },
): Promise<WeightLog> {
  const [row] = await db
    .insert(weightLogs)
    .values({
      userId,
      logDate: input.logDate,
      weightKg: input.weightKg,
      bodyFatPct: input.bodyFatPct ?? null,
    })
    .onConflictDoUpdate({
      target: [weightLogs.userId, weightLogs.logDate],
      set: { weightKg: input.weightKg, bodyFatPct: input.bodyFatPct ?? null },
    })
    .returning();

  return row;
}

/**
 * ประวัติน้ำหนักย้อนหลังพร้อมเส้นแนวโน้ม
 * คำนวณเส้นแนวโน้มใน JavaScript ตามกฎของโปรเจกต์ ไม่เขียนสูตรลง SQL
 */
export async function getWeightTrend(
  userId: string,
  days = 90,
  onDate: DateString = today(),
): Promise<TrendPoint[]> {
  const since = addDays(onDate, -days);
  const rows = await db
    .select()
    .from(weightLogs)
    .where(and(eq(weightLogs.userId, userId), gte(weightLogs.logDate, since)))
    .orderBy(weightLogs.logDate);

  return withTrend(rows.map((row) => ({ date: row.logDate, weightKg: row.weightKg })));
}

/** น้ำหนักที่ชั่งล่าสุด ไม่จำกัดช่วงเวลา — ใช้เติมค่าตั้งต้นในฟอร์ม */
export async function getLastWeightLog(userId: string): Promise<WeightLog | null> {
  const [row] = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.logDate))
    .limit(1);
  return row ?? null;
}
