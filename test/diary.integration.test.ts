import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, createTestUser } from "./db-harness";

const testDb = await createTestDb();
vi.mock("@/db", () => ({ db: testDb }));

const { addFoodEntry, addQuickEntry, copyDay, deleteEntry, loadDay } = await import("@/lib/diary");
const { searchFoods } = await import("@/lib/foods");
const { saveProfile } = await import("@/lib/profile");
const { foods, foodServings } = await import("@/db/schema");

const DATE = "2026-09-02";

let userId: string;
let riceId: string;
let riceCupId: string;
let eggId: string;

beforeAll(async () => {
  userId = await createTestUser(testDb);
  await saveProfile(userId, {
    sex: "male",
    birthDate: "1998-05-20",
    heightCm: 178,
    weightKg: 80,
    activityLevel: "light",
    goal: "lose",
    rateKgPerWeek: -0.5,
  });

  const inserted = await testDb
    .insert(foods)
    .values([
      {
        name: "Rice, white, long-grain, regular, enriched, cooked",
        nameTh: "ข้าวสวย",
        source: "usda",
        sourceRef: "168878",
        kcalPer100g: 130,
        proteinPer100g: 2.69,
        carbPer100g: 28.2,
        fatPer100g: 0.28,
        micros: { sodium_mg: 1, fiber_g: 0.4 },
        verified: true,
      },
      {
        name: "Egg, whole, cooked, hard-boiled",
        nameTh: "ไข่ต้ม",
        source: "usda",
        sourceRef: "173424",
        kcalPer100g: 155,
        proteinPer100g: 12.6,
        carbPer100g: 1.12,
        fatPer100g: 10.6,
        micros: { sodium_mg: 124, cholesterol_mg: 373 },
        verified: true,
      },
    ])
    .returning();

  riceId = inserted[0].id;
  eggId = inserted[1].id;

  const servings = await testDb
    .insert(foodServings)
    .values([
      { foodId: riceId, label: "cup", grams: 158, isDefault: true },
      { foodId: eggId, label: "large", grams: 50, isDefault: true },
    ])
    .returning();
  riceCupId = servings[0].id;
});

describe("บันทึกอาหารจากคลัง", () => {
  it("server คำนวณสารอาหารเองจากค่าต่อ 100 ก.", async () => {
    const entry = (await addFoodEntry(userId, {
      entryDate: DATE,
      meal: "lunch",
      foodId: riceId,
      grams: 200,
      quantity: 1,
    }))!;

    expect(entry.name).toBe("ข้าวสวย");
    expect(entry.kcal).toBe(260);
    expect(entry.carb).toBeCloseTo(56.4, 2);
    expect(entry.micros.sodium_mg).toBe(2);
  });

  it("เลือกหน่วยครัวแล้วคูณจำนวนได้", async () => {
    const entry = (await addFoodEntry(userId, {
      entryDate: DATE,
      meal: "breakfast",
      foodId: riceId,
      servingId: riceCupId,
      quantity: 2,
    }))!;

    expect(entry.grams).toBe(316);
    expect(entry.servingLabel).toBe("2 × cup");
    expect(entry.kcal).toBeCloseTo(410.8, 1);
  });

  it("ปฏิเสธหน่วยครัวที่ไม่ใช่ของอาหารรายการนั้น", async () => {
    const entry = await addFoodEntry(userId, {
      entryDate: DATE,
      meal: "dinner",
      foodId: eggId,
      servingId: riceCupId,
      quantity: 1,
    });
    expect(entry).toBeNull();
  });

  it("ปฏิเสธอาหารที่ไม่มีอยู่จริง", async () => {
    const entry = await addFoodEntry(userId, {
      entryDate: DATE,
      meal: "dinner",
      foodId: crypto.randomUUID(),
      grams: 100,
      quantity: 1,
    });
    expect(entry).toBeNull();
  });
});

describe("ยอดรวมของวัน", () => {
  it("แยกตามมื้อและรวมทั้งวันให้ตรงกัน", async () => {
    const day = await loadDay(userId, DATE);

    expect(day.entriesByMeal.lunch).toHaveLength(1);
    expect(day.entriesByMeal.breakfast).toHaveLength(1);
    expect(day.mealTotals.lunch.kcal).toBe(260);

    const sumOfMeals =
      day.mealTotals.breakfast.kcal +
      day.mealTotals.lunch.kcal +
      day.mealTotals.dinner.kcal +
      day.mealTotals.snack.kcal;
    expect(day.totals.kcal).toBeCloseTo(sumOfMeals, 2);
  });

  it("แนบเป้าของวันนั้นมาด้วย", async () => {
    const day = await loadDay(userId, DATE);
    expect(day.target?.kcal).toBeGreaterThan(1500);
  });

  it("quick add ไม่มีไมโคร — ต้องไม่ถูกนับเป็นศูนย์", async () => {
    const other = await createTestUser(testDb, "quick@bodymefit.app");
    await addQuickEntry(other, {
      entryDate: DATE,
      meal: "snack",
      name: "ชาไข่มุก",
      kcal: 320,
      protein: 3,
      carb: 62,
      fat: 7,
    });
    const day = await loadDay(other, DATE);
    expect(day.totals.kcal).toBe(320);
    expect(Object.keys(day.totals.micros)).toHaveLength(0);
  });
});

describe("การลบ", () => {
  it("ลบของคนอื่นไม่ได้ และตอบเหมือนกันกับกรณีไม่มีรายการนั้น", async () => {
    const intruder = await createTestUser(testDb, "intruder@bodymefit.app");
    const day = await loadDay(userId, DATE);
    const victim = day.entriesByMeal.lunch[0];

    expect(await deleteEntry(intruder, victim.id)).toBe(false);
    expect(await deleteEntry(intruder, crypto.randomUUID())).toBe(false);
    expect((await loadDay(userId, DATE)).entriesByMeal.lunch).toHaveLength(1);
  });

  it("เจ้าของลบได้", async () => {
    const day = await loadDay(userId, DATE);
    expect(await deleteEntry(userId, day.entriesByMeal.lunch[0].id)).toBe(true);
    expect((await loadDay(userId, DATE)).entriesByMeal.lunch).toHaveLength(0);
  });
});

describe("คัดลอกมื้อจากวันอื่น", () => {
  it("คัดลอกตัวเลขที่ตรึงไว้ ไม่คำนวณใหม่จากคลัง", async () => {
    const copied = await copyDay(userId, DATE, "2026-09-03");
    expect(copied).toBeGreaterThan(0);

    const source = await loadDay(userId, DATE);
    // แก้ค่าในคลังหลังคัดลอก — ยอดที่คัดลอกไปแล้วต้องไม่ขยับตาม
    await testDb.$client.query("UPDATE foods SET kcal_per_100g = 999 WHERE id = $1", [riceId]);
    const target = await loadDay(userId, "2026-09-03");

    expect(target.totals.kcal).toBeCloseTo(source.totals.kcal, 2);
  });
});

describe("การค้นหาอาหาร", () => {
  it("ค้นด้วยคำไทยเจอ", async () => {
    const hits = await searchFoods("ข้าว", userId);
    expect(hits.map((h) => h.nameTh)).toContain("ข้าวสวย");
  });

  it("ค้นด้วยคำอังกฤษกลางชื่อก็เจอ", async () => {
    const hits = await searchFoods("hard-boiled", userId);
    expect(hits.map((h) => h.nameTh)).toContain("ไข่ต้ม");
  });

  it("คำค้นสั้นเกินไปไม่ต้องยิงฐานข้อมูล", async () => {
    expect(await searchFoods("ข", userId)).toEqual([]);
  });
});
