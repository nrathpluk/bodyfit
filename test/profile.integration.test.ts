import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, createTestUser } from "./db-harness";

// ชั้น query import `db` ตัวจริง — สลับเป็นฐานข้อมูลในหน่วยความจำก่อนที่โมดูลจะถูกโหลด
const testDb = await createTestDb();
vi.mock("@/db", () => ({ db: testDb }));

const { ensureDailyTarget, getLatestWeight, getProfile, saveProfile } = await import(
  "@/lib/profile"
);
const { dailyTargets, diaryEntries } = await import("@/db/schema");
const { today } = await import("@/lib/dates");

const baseInput = {
  displayName: "นราธิป",
  sex: "male" as const,
  birthDate: "1998-05-20",
  heightCm: 178,
  weightKg: 80,
  activityLevel: "light" as const,
  goal: "lose" as const,
  rateKgPerWeek: -0.5,
};

describe("บันทึกโปรไฟล์", () => {
  let userId: string;

  beforeAll(async () => {
    userId = await createTestUser(testDb);
  });

  it("บันทึกโปรไฟล์ น้ำหนัก และเป้าของวันนี้ในครั้งเดียว", async () => {
    const target = await saveProfile(userId, baseInput);

    const profile = await getProfile(userId);
    expect(profile?.displayName).toBe("นราธิป");
    expect(profile?.heightCm).toBe(178);

    const weight = await getLatestWeight(userId);
    expect(weight?.weightKg).toBe(80);
    expect(weight?.logDate).toBe(today());

    expect(target.kcal).toBeGreaterThan(1500);
    expect(target.basis.formula).toBe("mifflin-st-jeor");
  });

  it("บันทึกซ้ำเป็นการแก้ทับ ไม่ใช่เพิ่มแถวใหม่", async () => {
    await saveProfile(userId, { ...baseInput, weightKg: 78, displayName: "นราธิป 2" });

    const profile = await getProfile(userId);
    expect(profile?.displayName).toBe("นราธิป 2");

    const rows = await testDb.select().from(dailyTargets);
    expect(rows).toHaveLength(1);
  });

  it("แก้โปรไฟล์แล้วเป้าของวันนี้ถูกคำนวณใหม่", async () => {
    const before = await saveProfile(userId, { ...baseInput, activityLevel: "sedentary" });
    const after = await saveProfile(userId, { ...baseInput, activityLevel: "very_active" });
    expect(after.kcal).toBeGreaterThan(before.kcal);
  });
});

describe("การตรึงเป้ารายวัน", () => {
  it("เป้าที่ตรึงไว้แล้วต้องไม่เปลี่ยน แม้น้ำหนักจะขยับ", async () => {
    const userId = await createTestUser(testDb, "pinned@bodymefit.app");
    const pinned = await saveProfile(userId, baseInput);

    // ชั่งน้ำหนักใหม่ในวันเดียวกัน แล้วขอเป้าอีกครั้ง
    await testDb.$client.query(
      "UPDATE weight_logs SET weight_kg = 70 WHERE user_id = $1",
      [userId],
    );
    const again = await ensureDailyTarget(userId);

    expect(again?.kcal).toBe(pinned.kcal);
    expect(again?.basis.weightKg).toBe(80);
  });

  it("คืน null เมื่อยังไม่มีโปรไฟล์ (ผู้ใช้ยังทำ onboarding ไม่จบ)", async () => {
    const userId = await createTestUser(testDb, "empty@bodymefit.app");
    expect(await ensureDailyTarget(userId)).toBeNull();
  });

  it("ผู้ใช้คนละคนมีเป้าคนละอัน", async () => {
    const a = await createTestUser(testDb, "a@bodymefit.app");
    const b = await createTestUser(testDb, "b@bodymefit.app");
    const targetA = await saveProfile(a, baseInput);
    const targetB = await saveProfile(b, { ...baseInput, sex: "female", weightKg: 55 });
    expect(targetA.kcal).not.toBe(targetB.kcal);
  });
});

describe("ข้อบังคับของฐานข้อมูล", () => {
  it("ลบผู้ใช้แล้วข้อมูลทุกตารางหายตาม (FK cascade)", async () => {
    const userId = await createTestUser(testDb, "cascade@bodymefit.app");
    await saveProfile(userId, baseInput);
    await testDb.insert(diaryEntries).values({
      userId,
      entryDate: today(),
      meal: "lunch",
      name: "ข้าวมันไก่",
      grams: 300,
      kcal: 600,
      protein: 30,
      carb: 70,
      fat: 22,
    });

    await testDb.$client.query("DELETE FROM auth.users WHERE id = $1", [userId]);

    expect(await getProfile(userId)).toBeNull();
    expect(await testDb.select().from(diaryEntries)).toHaveLength(0);
  });

  it("เปิด RLS ครบทุกตาราง — ตารางใหม่ที่ลืมเปิดจะทำให้เทสต์นี้พัง", async () => {
    const result = await testDb.$client.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'`,
    );
    const withoutRls = result.rows.filter((row) => !row.relrowsecurity).map((row) => row.relname);
    expect(withoutRls).toEqual([]);
  });
});
