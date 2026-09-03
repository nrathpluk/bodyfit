import "server-only";
import { and, asc, desc, eq, gte } from "drizzle-orm";
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

/** หาท่าเดิมจากชื่อ ถ้ายังไม่มีให้สร้างใหม่ — ชื่อซ้ำต่อผู้ใช้หนึ่งคนไม่ได้ */
export async function findOrCreateExercise(userId: string, name: string): Promise<Exercise> {
  const trimmed = name.trim();
  const [existing] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.userId, userId), eq(exercises.name, trimmed)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(exercises)
    .values({ userId, name: trimmed })
    .onConflictDoUpdate({
      target: [exercises.userId, exercises.name],
      set: { name: trimmed },
    })
    .returning();
  return created;
}

export async function listExercises(userId: string): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(eq(exercises.userId, userId))
    .orderBy(asc(exercises.name));
}

export async function addWorkoutSet(
  userId: string,
  input: { exerciseName: string; logDate: DateString; weightKg: number; reps: number },
): Promise<WorkoutSetRow> {
  const exercise = await findOrCreateExercise(userId, input.exerciseName);

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

export async function deleteExercise(userId: string, exerciseId: string): Promise<boolean> {
  const removed = await db
    .delete(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .returning({ id: exercises.id });
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
  const [allExercises, sets] = await Promise.all([
    listExercises(userId),
    db
      .select()
      .from(workoutSets)
      .where(and(eq(workoutSets.userId, userId), gte(workoutSets.logDate, since)))
      .orderBy(asc(workoutSets.logDate)),
  ]);

  const byExercise = new Map<string, Map<string, WorkoutSetRow[]>>();
  for (const set of sets) {
    const days = byExercise.get(set.exerciseId) ?? new Map<string, WorkoutSetRow[]>();
    const list = days.get(set.logDate) ?? [];
    list.push(set);
    days.set(set.logDate, list);
    byExercise.set(set.exerciseId, days);
  }

  return allExercises.map((exercise) => {
    const days = byExercise.get(exercise.id) ?? new Map<string, WorkoutSetRow[]>();
    const sessions: SessionPoint[] = [...days.entries()]
      .map(([date, daySets]) => ({
        date,
        oneRepMax: bestOneRepMax(daySets),
        volumeKg: totalVolume(daySets),
        sets: daySets.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      ...exercise,
      sessions,
      progress: progressTrend(sessions),
      lastDate: sessions.length > 0 ? sessions[sessions.length - 1].date : null,
      bestEver: sessions.reduce((best, s) => Math.max(best, s.oneRepMax), 0),
    };
  });
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
export async function getRecentExerciseNames(userId: string, limit = 8): Promise<string[]> {
  const rows = await db
    .select({ name: exercises.name, logDate: workoutSets.logDate })
    .from(workoutSets)
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(eq(workoutSets.userId, userId))
    .orderBy(desc(workoutSets.logDate))
    .limit(limit * 6);

  const seen: string[] = [];
  for (const row of rows) {
    if (!seen.includes(row.name)) seen.push(row.name);
    if (seen.length >= limit) break;
  }
  return seen;
}
