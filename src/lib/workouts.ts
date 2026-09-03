import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workoutSets } from "@/db/schema";
import { addDays, today, type DateString } from "./dates";
import {
  bestOneRepMax,
  progressTrend,
  totalVolume,
  type Progress,
  type SessionPoint,
} from "./strength";

export type Exercise = typeof exercises.$inferSelect;
export type WorkoutSetRow = typeof workoutSets.$inferSelect;

export type ExerciseSummary = Exercise & {
  sessions: SessionPoint[];
  progress: Progress | null;
  lastDate: DateString | null;
  bestEver: number;
};

/**
 * ค้นหาท่าจากคลังกลาง + ท่าที่ผู้ใช้สร้างเอง
 *
 * เรียงท่าที่ผู้ใช้สร้างเองขึ้นก่อน เพราะถ้าเขาอุตส่าห์สร้างเองแปลว่าคลังกลางไม่มี
 * แล้วค่อยเรียงตามความใกล้เคียงของคำ และชื่อสั้นก่อน (ชื่อยาวมักเป็นท่าเฉพาะทาง)
 */
export async function searchExercises(query: string, userId: string, limit = 20) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;
  return db
    .select({
      id: exercises.id,
      name: exercises.name,
      equipment: exercises.equipment,
      category: exercises.category,
      primaryMuscle: exercises.primaryMuscle,
      isCustom: sql<boolean>`${exercises.userId} IS NOT NULL`,
    })
    .from(exercises)
    .where(
      and(
        sql`${exercises.name} ILIKE ${pattern}`,
        or(isNull(exercises.userId), eq(exercises.userId, userId)),
      ),
    )
    .orderBy(
      sql`(${exercises.userId} IS NOT NULL) DESC`,
      sql`extensions.similarity(${exercises.name}, ${trimmed}) DESC`,
      sql`length(${exercises.name}) ASC`,
    )
    .limit(limit);
}

/**
 * หาท่าเดิมจากชื่อ ถ้ายังไม่มีให้สร้างเป็นท่าส่วนตัว
 *
 * ดูในคลังกลางก่อนเสมอ ถ้าคลังกลางมีชื่อนั้นอยู่แล้วให้ใช้ตัวนั้น
 * ไม่งั้นผู้ใช้ที่พิมพ์ "Bench Dips" เองจะได้ท่าซ้ำอีกอันที่กราฟแยกกัน
 */
export async function findOrCreateExercise(userId: string, name: string): Promise<Exercise> {
  const trimmed = name.trim();

  const [existing] = await db
    .select()
    .from(exercises)
    .where(
      and(
        eq(exercises.name, trimmed),
        or(isNull(exercises.userId), eq(exercises.userId, userId)),
      ),
    )
    .orderBy(sql`(${exercises.userId} IS NOT NULL) DESC`)
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(exercises)
    .values({ userId, name: trimmed, source: "custom" })
    .returning();
  return created;
}

/** ท่าที่ผู้ใช้สร้างเอง (ไม่รวมคลังกลาง 876 ท่า ซึ่งไม่ควรเอามาไล่แสดงทั้งหมด) */
export async function listCustomExercises(userId: string): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(eq(exercises.userId, userId))
    .orderBy(asc(exercises.name));
}

export async function addWorkoutSet(
  userId: string,
  input: {
    /** เลือกจากคลังแล้วส่ง id มา — ทางหลัก */
    exerciseId?: string;
    /** พิมพ์ชื่อเองเมื่อคลังไม่มี — ทางสำรอง */
    exerciseName?: string;
    logDate: DateString;
    weightKg: number;
    reps: number;
  },
): Promise<WorkoutSetRow | null> {
  let exercise: Exercise | undefined;

  if (input.exerciseId) {
    // ตรวจว่าท่านี้เป็นของคลังกลางหรือของผู้ใช้คนนี้จริง ไม่ใช่ท่าส่วนตัวของคนอื่น
    [exercise] = await db
      .select()
      .from(exercises)
      .where(
        and(
          eq(exercises.id, input.exerciseId),
          or(isNull(exercises.userId), eq(exercises.userId, userId)),
        ),
      )
      .limit(1);
    if (!exercise) return null;
  } else if (input.exerciseName?.trim()) {
    exercise = await findOrCreateExercise(userId, input.exerciseName);
  } else {
    return null;
  }

  const sameDay = await db
    .select({ id: workoutSets.id })
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.userId, userId),
        eq(workoutSets.exerciseId, exercise.id),
        eq(workoutSets.logDate, input.logDate),
      ),
    );

  const [row] = await db
    .insert(workoutSets)
    .values({
      userId,
      exerciseId: exercise.id,
      logDate: input.logDate,
      weightKg: input.weightKg,
      reps: input.reps,
      sortOrder: sameDay.length,
    })
    .returning();
  return row;
}

/** ลบด้วย id + userId ในคำสั่งเดียว ตามกฎเดียวกับการลบรายการอาหาร */
export async function deleteWorkoutSet(userId: string, setId: string): Promise<boolean> {
  const removed = await db
    .delete(workoutSets)
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)))
    .returning({ id: workoutSets.id });
  return removed.length > 0;
}

/**
 * ลบประวัติของท่านั้นทั้งหมดของผู้ใช้คนนี้
 *
 * ไม่ลบตัวท่าออกจากคลังกลาง เพราะคนอื่นใช้อยู่ — ลบเฉพาะเซ็ตที่ตัวเองบันทึก
 * ส่วนท่าที่ผู้ใช้สร้างเอง ลบทิ้งไปเลยเพราะไม่มีใครใช้ต่อ
 */
export async function deleteExerciseHistory(
  userId: string,
  exerciseId: string,
): Promise<boolean> {
  const removed = await db
    .delete(workoutSets)
    .where(and(eq(workoutSets.exerciseId, exerciseId), eq(workoutSets.userId, userId)))
    .returning({ id: workoutSets.id });

  await db
    .delete(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));

  return removed.length > 0;
}

/**
 * สรุปความก้าวหน้าของทุกท่า
 *
 * ยุบเซ็ตทั้งหมดของวันหนึ่งให้เหลือจุดเดียว (1RM ที่ดีที่สุดของวันนั้น)
 * เพราะสิ่งที่บอกว่าแข็งแรงขึ้นคือเพดานของวัน ไม่ใช่จำนวนเซ็ตที่ทำ
 *
 * รวมยอดใน JavaScript ตามกฎของโปรเจกต์ ไม่เขียนสูตรชุดที่สองลง SQL
 */
export async function getExerciseSummaries(
  userId: string,
  days = 180,
  onDate: DateString = today(),
): Promise<ExerciseSummary[]> {
  const since = addDays(onDate, -days);

  /*
   * ไล่จาก "เซ็ตที่ผู้ใช้บันทึก" ไม่ใช่จากตารางท่า
   * เพราะคลังกลางมี 876 ท่า ถ้าไล่จากตารางท่าจะได้การ์ดเปล่า 876 ใบ
   */
  const sets = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.userId, userId), gte(workoutSets.logDate, since)))
    .orderBy(asc(workoutSets.logDate));

  if (sets.length === 0) return [];

  const exerciseIds = [...new Set(sets.map((set) => set.exerciseId))];
  const rows = await db.select().from(exercises).where(inArray(exercises.id, exerciseIds));
  const byId = new Map(rows.map((row) => [row.id, row]));

  const byExercise = new Map<string, Map<string, WorkoutSetRow[]>>();
  for (const set of sets) {
    const days = byExercise.get(set.exerciseId) ?? new Map<string, WorkoutSetRow[]>();
    const list = days.get(set.logDate) ?? [];
    list.push(set);
    days.set(set.logDate, list);
    byExercise.set(set.exerciseId, days);
  }

  const summaries: ExerciseSummary[] = [];
  for (const [exerciseId, days] of byExercise) {
    const exercise = byId.get(exerciseId);
    if (!exercise) continue;

    const sessions: SessionPoint[] = [...days.entries()]
      .map(([date, daySets]) => ({
        date,
        oneRepMax: bestOneRepMax(daySets),
        volumeKg: totalVolume(daySets),
        sets: daySets.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    summaries.push({
      ...exercise,
      sessions,
      progress: progressTrend(sessions),
      lastDate: sessions[sessions.length - 1].date,
      bestEver: sessions.reduce((best, s) => Math.max(best, s.oneRepMax), 0),
    });
  }

  // ท่าที่เพิ่งเล่นขึ้นก่อน
  return summaries.sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? ""));
}

/** เซ็ตของวันหนึ่ง จัดกลุ่มตามท่า — ใช้แสดงในหน้าบันทึกของวันนั้น */
export async function getDaySets(userId: string, date: DateString = today()) {
  const rows = await db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      name: exercises.name,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
      sortOrder: workoutSets.sortOrder,
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(and(eq(workoutSets.userId, userId), eq(workoutSets.logDate, date)))
    .orderBy(asc(exercises.name), asc(workoutSets.sortOrder));

  const grouped = new Map<string, { name: string; sets: typeof rows }>();
  for (const row of rows) {
    const entry = grouped.get(row.exerciseId) ?? { name: row.name, sets: [] };
    entry.sets.push(row);
    grouped.set(row.exerciseId, entry);
  }
  return [...grouped.entries()].map(([exerciseId, value]) => ({ exerciseId, ...value }));
}

/** ท่าที่เพิ่งเล่น ใช้เติมปุ่มลัดในฟอร์ม */
export async function getRecentExercises(userId: string, limit = 8) {
  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      logDate: workoutSets.logDate,
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(eq(workoutSets.userId, userId))
    .orderBy(desc(workoutSets.logDate))
    .limit(limit * 6);

  const seen = new Map<string, string>();
  for (const row of rows) {
    if (!seen.has(row.id)) seen.set(row.id, row.name);
    if (seen.size >= limit) break;
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}
