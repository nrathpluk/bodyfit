import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyTargets, profiles, weightLogs } from "@/db/schema";
import { ageOn, today, type DateString } from "./dates";
import { dailyTarget, type DailyTarget } from "./nutrition";
import type { ProfileInput } from "./validation";

export type Profile = typeof profiles.$inferSelect;

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ?? null;
}

/** น้ำหนักล่าสุดที่ชั่งไว้ — ใช้เป็นตัวตั้งของสูตรพลังงาน */
export async function getLatestWeight(userId: string) {
  const [row] = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.logDate))
    .limit(1);
  return row ?? null;
}

function computeTarget(profile: Profile, weightKg: number, onDate: DateString): DailyTarget {
  return dailyTarget({
    sex: profile.sex,
    weightKg,
    heightCm: profile.heightCm,
    ageYears: ageOn(profile.birthDate, onDate),
    activity: profile.activityLevel,
    goal: profile.goal,
    rateKgPerWeek: profile.rateKgPerWeek,
  });
}

/**
 * บันทึกโปรไฟล์ + น้ำหนักของวันนี้ แล้วคำนวณเป้าของวันนี้ใหม่
 *
 * ตรงนี้เป็นจุดเดียวที่ "ทับ" เป้าที่ตรึงไว้แล้วได้ เพราะผู้ใช้เพิ่งแก้ข้อมูลตั้งต้นเอง
 * ที่อื่นให้ใช้ ensureDailyTarget() ซึ่งจะไม่แตะเป้าที่มีอยู่แล้ว
 */
export async function saveProfile(userId: string, input: ProfileInput): Promise<DailyTarget> {
  const date = today();

  const [profile] = await db
    .insert(profiles)
    .values({
      userId,
      displayName: input.displayName || null,
      sex: input.sex,
      birthDate: input.birthDate,
      heightCm: input.heightCm,
      activityLevel: input.activityLevel,
      goal: input.goal,
      rateKgPerWeek: input.goal === "maintain" ? 0 : input.rateKgPerWeek,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName: input.displayName || null,
        sex: input.sex,
        birthDate: input.birthDate,
        heightCm: input.heightCm,
        activityLevel: input.activityLevel,
        goal: input.goal,
        rateKgPerWeek: input.goal === "maintain" ? 0 : input.rateKgPerWeek,
        updatedAt: new Date(),
      },
    })
    .returning();

  await db
    .insert(weightLogs)
    .values({ userId, logDate: date, weightKg: input.weightKg })
    .onConflictDoUpdate({
      target: [weightLogs.userId, weightLogs.logDate],
      set: { weightKg: input.weightKg },
    });

  const target = computeTarget(profile, input.weightKg, date);
  await db
    .insert(dailyTargets)
    .values({ userId, targetDate: date, ...target })
    .onConflictDoUpdate({
      target: [dailyTargets.userId, dailyTargets.targetDate],
      set: { ...target },
    });

  return target;
}

/**
 * เป้าของวันที่กำหนด — ตรึงครั้งเดียวแล้วไม่เปลี่ยนอีก
 *
 * ถ้ามีแถวอยู่แล้วให้คืนค่าเดิม ห้ามคำนวณทับ: น้ำหนักตัวขยับทุกสัปดาห์
 * ถ้าคำนวณใหม่ทุกครั้ง กราฟ "กินเทียบเป้า" ย้อนหลังจะเปลี่ยนตัวเลขเอง
 * คืน null เมื่อยังไม่มีโปรไฟล์หรือยังไม่เคยชั่งน้ำหนัก (ผู้ใช้ยังทำ onboarding ไม่จบ)
 */
export async function ensureDailyTarget(
  userId: string,
  date: DateString = today(),
): Promise<DailyTarget | null> {
  const [existing] = await db
    .select()
    .from(dailyTargets)
    .where(and(eq(dailyTargets.userId, userId), eq(dailyTargets.targetDate, date)))
    .limit(1);

  if (existing) {
    return {
      kcal: existing.kcal,
      protein: existing.protein,
      carb: existing.carb,
      fat: existing.fat,
      basis: existing.basis as DailyTarget["basis"],
    };
  }

  const profile = await getProfile(userId);
  const weight = await getLatestWeight(userId);
  if (!profile || !weight) return null;

  const target = computeTarget(profile, weight.weightKg, date);
  await db
    .insert(dailyTargets)
    .values({ userId, targetDate: date, ...target })
    // แข่งกันเขียนพร้อมกันได้ (ผู้ใช้เปิดสองแท็บ) — ใครถึงก่อนเป็นเจ้าของเป้าวันนั้น
    .onConflictDoNothing();

  return target;
}
