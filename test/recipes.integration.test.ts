import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, createTestUser } from "./db-harness";

const testDb = await createTestDb();
vi.mock("@/db", () => ({ db: testDb }));

const { addRecipeItem, createRecipe, deleteRecipe, getRecipe, listRecipes, removeRecipeItem } =
  await import("@/lib/recipes");
const { addRecipeEntry, loadDay } = await import("@/lib/diary");
const { foods } = await import("@/db/schema");

const DATE = "2026-10-05";

let userId: string;
let porkId: string;
let riceId: string;

beforeAll(async () => {
  userId = await createTestUser(testDb, "recipe@bodymefit.app");

  const inserted = await testDb
    .insert(foods)
    .values([
      {
        name: "Pork, fresh, ground, cooked",
        nameTh: "หมูสับสุก",
        source: "usda",
        sourceRef: "167903",
        kcalPer100g: 297,
        proteinPer100g: 25.7,
        carbPer100g: 0,
        fatPer100g: 20.8,
        micros: { sodium_mg: 76 },
        verified: true,
      },
      {
        name: "Rice, white, cooked",
        nameTh: "ข้าวสวย",
        source: "usda",
        sourceRef: "168878",
        kcalPer100g: 130,
        proteinPer100g: 2.69,
        carbPer100g: 28.2,
        fatPer100g: 0.28,
        micros: { sodium_mg: 1 },
        verified: true,
      },
    ])
    .returning();
  porkId = inserted[0].id;
  riceId = inserted[1].id;
});

describe("สูตรของผู้ใช้", () => {
  it("รวมสารอาหารจากวัตถุดิบแล้วหารตามจำนวนที่", async () => {
    const recipe = await createRecipe(userId, { name: "กะเพราหมูสับ", servings: 2 });
    await addRecipeItem(userId, recipe.id, { foodId: porkId, grams: 200 });
    await addRecipeItem(userId, recipe.id, { foodId: riceId, grams: 400 });

    const full = (await getRecipe(userId, recipe.id))!;
    // หมู 200 ก. = 594 kcal, ข้าว 400 ก. = 520 kcal, รวม 1,114 หารสอง = 557
    expect(full.perServing.kcal).toBeCloseTo(557, 0);
    expect(full.totalGrams).toBe(600);
    expect(full.ingredients).toHaveLength(2);
  });

  it("ไมโครถูกรวมและหารด้วย ไม่ใช่หายไป", async () => {
    const [recipe] = await listRecipes(userId);
    // โซเดียม: หมู 152 + ข้าว 4 = 156 หารสอง = 78
    expect(recipe.perServing.micros.sodium_mg).toBeCloseTo(78, 0);
  });

  it("แก้สูตรแล้วตัวเลขเปลี่ยนตามทันที เพราะคำนวณสดจากส่วนประกอบ", async () => {
    const [recipe] = await listRecipes(userId);
    const before = recipe.perServing.kcal;

    await removeRecipeItem(userId, recipe.id, recipe.ingredients[1].itemId);
    const after = (await getRecipe(userId, recipe.id))!;
    expect(after.perServing.kcal).toBeLessThan(before);
  });

  it("เพิ่มวัตถุดิบเข้าสูตรของคนอื่นไม่ได้", async () => {
    const intruder = await createTestUser(testDb, "recipe-intruder@bodymefit.app");
    const [recipe] = await listRecipes(userId);
    expect(await addRecipeItem(intruder, recipe.id, { foodId: riceId, grams: 100 })).toBe(false);
  });

  it("ลบสูตรของคนอื่นไม่ได้ และตอบเหมือนกับกรณีไม่มีสูตรนั้น", async () => {
    const intruder = await createTestUser(testDb, "recipe-intruder2@bodymefit.app");
    const [recipe] = await listRecipes(userId);
    expect(await deleteRecipe(intruder, recipe.id)).toBe(false);
    expect(await deleteRecipe(intruder, crypto.randomUUID())).toBe(false);
  });
});

describe("บันทึกสูตรลงไดอารี", () => {
  it("server คำนวณเองจากส่วนประกอบ แล้ว snapshot ตัวเลขไว้", async () => {
    const owner = await createTestUser(testDb, "recipe-log@bodymefit.app");
    const recipe = await createRecipe(owner, { name: "ข้าวหมู", servings: 2 });
    await addRecipeItem(owner, recipe.id, { foodId: porkId, grams: 200 });
    await addRecipeItem(owner, recipe.id, { foodId: riceId, grams: 400 });

    const entry = await addRecipeEntry(owner, {
      recipeId: recipe.id,
      entryDate: DATE,
      meal: "lunch",
      servings: 1,
    });

    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("ข้าวหมู");
    expect(entry!.kcal).toBeCloseTo(557, 0);
    expect(entry!.servingLabel).toBe("1 ที่");
    expect(entry!.grams).toBe(300);
  });

  it("กินสองที่ได้สารอาหารสองเท่า", async () => {
    const owner = await createTestUser(testDb, "recipe-double@bodymefit.app");
    const recipe = await createRecipe(owner, { name: "ข้าวหมูสองที่", servings: 2 });
    await addRecipeItem(owner, recipe.id, { foodId: porkId, grams: 200 });

    const one = await addRecipeEntry(owner, {
      recipeId: recipe.id,
      entryDate: DATE,
      meal: "lunch",
      servings: 1,
    });
    const two = await addRecipeEntry(owner, {
      recipeId: recipe.id,
      entryDate: DATE,
      meal: "dinner",
      servings: 2,
    });

    expect(two!.kcal).toBeCloseTo(one!.kcal * 2, 0);
  });

  it("แก้สูตรหลังบันทึกแล้ว ยอดที่บันทึกไปต้องไม่ขยับตาม", async () => {
    const owner = await createTestUser(testDb, "recipe-snap@bodymefit.app");
    const recipe = await createRecipe(owner, { name: "ทดสอบ snapshot", servings: 1 });
    await addRecipeItem(owner, recipe.id, { foodId: riceId, grams: 100 });
    await addRecipeEntry(owner, {
      recipeId: recipe.id,
      entryDate: DATE,
      meal: "snack",
      servings: 1,
    });

    const before = await loadDay(owner, DATE);
    await addRecipeItem(owner, recipe.id, { foodId: porkId, grams: 500 });
    const after = await loadDay(owner, DATE);

    expect(after.totals.kcal).toBe(before.totals.kcal);
  });

  it("สูตรที่ยังไม่มีวัตถุดิบบันทึกไม่ได้", async () => {
    const owner = await createTestUser(testDb, "recipe-empty@bodymefit.app");
    const recipe = await createRecipe(owner, { name: "ว่างเปล่า", servings: 1 });
    expect(
      await addRecipeEntry(owner, {
        recipeId: recipe.id,
        entryDate: DATE,
        meal: "lunch",
        servings: 1,
      }),
    ).toBeNull();
  });

  it("บันทึกสูตรของคนอื่นไม่ได้", async () => {
    const owner = await createTestUser(testDb, "recipe-owner2@bodymefit.app");
    const intruder = await createTestUser(testDb, "recipe-thief@bodymefit.app");
    const recipe = await createRecipe(owner, { name: "ของฉัน", servings: 1 });
    await addRecipeItem(owner, recipe.id, { foodId: riceId, grams: 100 });

    expect(
      await addRecipeEntry(intruder, {
        recipeId: recipe.id,
        entryDate: DATE,
        meal: "lunch",
        servings: 1,
      }),
    ).toBeNull();
  });
});
