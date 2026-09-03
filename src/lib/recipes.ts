import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { foods, recipeItems, recipes } from "@/db/schema";
import { perServing, scaleTo, sumNutrients, type Nutrients } from "./nutrition";

export type Recipe = typeof recipes.$inferSelect;

export type RecipeIngredient = {
  itemId: string;
  foodId: string;
  name: string;
  grams: number;
};

export type RecipeWithNutrients = Recipe & {
  ingredients: RecipeIngredient[];
  /** สารอาหารต่อหนึ่งที่ — ตัวเลขที่เอาไปบันทึกลงไดอารี */
  perServing: Nutrients;
  totalGrams: number;
};

/**
 * รวมสารอาหารของสูตรจากวัตถุดิบ
 *
 * คำนวณสดทุกครั้งโดยตั้งใจ ต่างจาก diary_entries ที่ต้อง snapshot
 * เพราะสูตรคือ "แบบ" ที่ผู้ใช้แก้ได้ ถ้าแก้ปริมาณหมูในสูตรแล้วตัวเลขไม่เปลี่ยน
 * ก็ไม่มีประโยชน์ที่จะแก้ — ส่วนมื้อที่บันทึกไปแล้วยังตรึงตัวเลขเดิมไว้ ไม่ขยับตาม
 */
async function attachNutrients(recipe: Recipe): Promise<RecipeWithNutrients> {
  const items = await db
    .select()
    .from(recipeItems)
    .where(eq(recipeItems.recipeId, recipe.id))
    .orderBy(asc(recipeItems.sortOrder));

  if (items.length === 0) {
    return {
      ...recipe,
      ingredients: [],
      perServing: { kcal: 0, protein: 0, carb: 0, fat: 0, micros: {} },
      totalGrams: 0,
    };
  }

  const foodRows = await db
    .select()
    .from(foods)
    .where(inArray(foods.id, items.map((item) => item.foodId)));
  const foodById = new Map(foodRows.map((row) => [row.id, row]));

  const ingredients: RecipeIngredient[] = [];
  const scaled: Nutrients[] = [];

  for (const item of items) {
    const food = foodById.get(item.foodId);
    if (!food) continue;
    ingredients.push({
      itemId: item.id,
      foodId: food.id,
      name: food.nameTh ?? food.name,
      grams: item.grams,
    });
    scaled.push(
      scaleTo(
        {
          kcalPer100g: food.kcalPer100g,
          proteinPer100g: food.proteinPer100g,
          carbPer100g: food.carbPer100g,
          fatPer100g: food.fatPer100g,
          micros: food.micros,
        },
        item.grams,
      ),
    );
  }

  return {
    ...recipe,
    ingredients,
    perServing: perServing(sumNutrients(scaled), recipe.servings),
    totalGrams: ingredients.reduce((sum, item) => sum + item.grams, 0),
  };
}

export async function listRecipes(userId: string): Promise<RecipeWithNutrients[]> {
  const rows = await db
    .select()
    .from(recipes)
    .where(eq(recipes.userId, userId))
    .orderBy(asc(recipes.name));
  return Promise.all(rows.map(attachNutrients));
}

export async function getRecipe(
  userId: string,
  recipeId: string,
): Promise<RecipeWithNutrients | null> {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .limit(1);
  return row ? attachNutrients(row) : null;
}

export async function createRecipe(
  userId: string,
  input: { name: string; servings: number; note?: string },
): Promise<Recipe> {
  const [row] = await db
    .insert(recipes)
    .values({ userId, name: input.name, servings: input.servings, note: input.note ?? null })
    .returning();
  return row;
}

/** เพิ่มวัตถุดิบเข้าสูตร — ตรวจว่าสูตรเป็นของผู้ใช้คนนี้จริงก่อนเสมอ */
export async function addRecipeItem(
  userId: string,
  recipeId: string,
  input: { foodId: string; grams: number },
): Promise<boolean> {
  const [owned] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .limit(1);
  if (!owned) return false;

  const existing = await db
    .select({ id: recipeItems.id })
    .from(recipeItems)
    .where(eq(recipeItems.recipeId, recipeId));

  await db.insert(recipeItems).values({
    recipeId,
    foodId: input.foodId,
    grams: input.grams,
    sortOrder: existing.length,
  });
  await db.update(recipes).set({ updatedAt: new Date() }).where(eq(recipes.id, recipeId));
  return true;
}

export async function removeRecipeItem(
  userId: string,
  recipeId: string,
  itemId: string,
): Promise<boolean> {
  const [owned] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .limit(1);
  if (!owned) return false;

  const removed = await db
    .delete(recipeItems)
    .where(and(eq(recipeItems.id, itemId), eq(recipeItems.recipeId, recipeId)))
    .returning({ id: recipeItems.id });
  return removed.length > 0;
}

/** ลบด้วยเงื่อนไข id + userId ในคำสั่งเดียว ตามกฎเดียวกับการลบรายการในไดอารี */
export async function deleteRecipe(userId: string, recipeId: string): Promise<boolean> {
  const removed = await db
    .delete(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .returning({ id: recipes.id });
  return removed.length > 0;
}
