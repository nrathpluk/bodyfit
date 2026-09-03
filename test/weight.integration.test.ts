import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, createTestUser } from "./db-harness";

const testDb = await createTestDb();
vi.mock("@/db", () => ({ db: testDb }));

const { logWeight, getWeightTrend, getLastWeightLog } = await import("@/lib/weight-queries");
const { ensureDailyTarget, saveProfile } = await import("@/lib/profile");
const { getIntakeStats, getLoggingStreak } = await import("@/lib/diary");
const { diaryEntries } = await import("@/db/schema");
const { addDays } = await import("@/lib/dates");

const TODAY = "2026-10-01";

const profileInput = {
  sex: "male" as const,
  birthDate: "1998-05-20",
  heightCm: 178,
  weightKg: 85,
  activityLevel: "light" as const,
  goal: "lose" as const,
  rateKgPerWeek: -0.5,
};

/** จำลองผู้ใช้ที่บันทึกอาหารและชั่งน้ำหนักทุกวันเป็นเวลา n วัน */
async function seedConsistentUser(email: string, days: number, kcalPerDay: number) {
  const userId = await createTestUser(testDb, email);
  await saveProfile(userId, profileInput);

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(TODAY, -i);
    // ลดจริงวันละ ~0.07 กก. พร้อม noise สลับขึ้นลง
    const weight = 85 - (days - 1 - i) * 0.07 + (i % 2 === 0 ? 0.3 : -0.3);
    await logWeight(userId, { logDate: date, weightKg: Math.round(weight * 100) / 100 });
    await testDb.insert(diaryEntries).values({
      userId,
      entryDate: date,
      meal: "lunch",
      name: "มื้อรวม",
      kcal: kcalPerDay,
      protein: 100,
      carb: 200,
      fat: 60,
    });
  }
  return userId;
}

describe("การบันทึกน้ำหนัก", () => {
  let userId: string;

  beforeAll(async () => {
    userId = await createTestUser(testDb, "weight@bodymefit.app");
  });

  it("ชั่งซ้ำวันเดิมคือทับค่าเดิม ไม่ใช่เพิ่มแถว", async () => {
    await logWeight(userId, { logDate: TODAY, weightKg: 70 });
    await logWeight(userId, { logDate: TODAY, weightKg: 69.5 });

    const trend = await getWeightTrend(userId, 90, TODAY);
    expect(trend).toHaveLength(1);
    expect(trend[0].weightKg).toBe(69.5);
  });

  it("คืนน้ำหนักล่าสุดไว้เติมค่าตั้งต้นในฟอร์ม", async () => {
    await logWeight(userId, { logDate: addDays(TODAY, -1), weightKg: 71 });
    const last = await getLastWeightLog(userId);
    expect(last?.logDate).toBe(TODAY);
    expect(last?.weightKg).toBe(69.5);
  });

  it("แนบเส้นแนวโน้มมาให้พร้อมข้อมูลดิบ", async () => {
    const trend = await getWeightTrend(userId, 90, TODAY);
    expect(trend[0]).toHaveProperty("trendKg");
  });
});

describe("สถิติการกินย้อนหลัง", () => {
  it("เฉลี่ยเฉพาะวันที่บันทึก ไม่นับวันที่ลืมเป็นศูนย์แคล", async () => {
    const userId = await createTestUser(testDb, "sparse@bodymefit.app");
    // บันทึกแค่ 2 วันจากช่วง 28 วัน วันละ 2,000
    for (const offset of [0, 1]) {
      await testDb.insert(diaryEntries).values({
        userId,
        entryDate: addDays(TODAY, -offset),
        meal: "lunch",
        name: "มื้อรวม",
        kcal: 2000,
        protein: 0,
        carb: 0,
        fat: 0,
      });
    }

    const stats = await getIntakeStats(userId, 28, TODAY);
    expect(stats.loggedDays).toBe(2);
    // ถ้าหารด้วย 28 จะได้ ~143 ซึ่งจะทำให้ระบบสรุปว่าเผาผลาญน้อยกว่าจริงมาก
    expect(stats.avgIntakeKcal).toBe(2000);
  });

  it("ความสม่ำเสมอรายงานเป็น x จาก y วัน ไม่ใช่ streak ที่ขาดแล้วเป็นศูนย์", async () => {
    const userId = await createTestUser(testDb, "streak@bodymefit.app");
    // บันทึกวันที่ 0, 2, 4 (เว้นวัน) ในช่วง 7 วัน
    for (const offset of [0, 2, 4]) {
      await testDb.insert(diaryEntries).values({
        userId,
        entryDate: addDays(TODAY, -offset),
        meal: "dinner",
        name: "มื้อรวม",
        kcal: 500,
        protein: 0,
        carb: 0,
        fat: 0,
      });
    }

    const streak = await getLoggingStreak(userId, 7, TODAY);
    expect(streak).toEqual({ loggedDays: 3, windowDays: 7 });
  });
});

describe("เป้าที่ปรับตามข้อมูลจริง", () => {
  it("ข้อมูลน้อยยังใช้สูตรล้วน", async () => {
    const userId = await seedConsistentUser("short@bodymefit.app", 6, 2000);
    const target = await ensureDailyTarget(userId, TODAY);
    expect(target?.basis.tdeeSource).toBe("formula");
    expect(target?.basis.tdeeConfidence).toBe(0);
  });

  it("บันทึกครบสี่สัปดาห์แล้วเปลี่ยนไปใช้ค่าที่วัดจากร่างกายจริง", async () => {
    const userId = await seedConsistentUser("long@bodymefit.app", 28, 2000);
    const target = await ensureDailyTarget(userId, TODAY);

    expect(target?.basis.tdeeSource).toBe("blended");
    expect(target?.basis.tdeeConfidence).toBeGreaterThan(0);
  });

  it("ใช้น้ำหนักแนวโน้มเป็นฐาน ไม่ใช่ตัวเลขดิบของวันล่าสุด", async () => {
    const userId = await seedConsistentUser("trendbase@bodymefit.app", 28, 2000);
    // วันสุดท้ายบวมน้ำ 2 กก.
    await logWeight(userId, { logDate: TODAY, weightKg: 85 });

    const target = await ensureDailyTarget(userId, TODAY);
    expect(target!.basis.weightKg).toBeLessThan(84);
  });

  it("เป้าที่ตรึงไว้แล้วยังไม่ถูกคำนวณทับ แม้ข้อมูลจะเปลี่ยน", async () => {
    const userId = await seedConsistentUser("pinned2@bodymefit.app", 28, 2000);
    const first = await ensureDailyTarget(userId, TODAY);

    await logWeight(userId, { logDate: TODAY, weightKg: 60 });
    const again = await ensureDailyTarget(userId, TODAY);

    expect(again?.kcal).toBe(first?.kcal);
  });
});
