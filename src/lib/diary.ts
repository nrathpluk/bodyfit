import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, foods, foodServings } from "@/db/schema";
import { type DateString, today } from "./dates";
import { scaleTo, sumNutrients, type Nutrients } from "./nutrition";
import { ensureDailyTarget } from "./profile";
import type { DailyTarget } from "./nutrition";
import type { MealSlot, Micros } from "./types";
import { MEAL_SLOTS } from "./types";
import type { DiaryFoodEntryInput, DiaryQuickEntryInput } from "./validation";

export type DiaryEntry = typeof diaryEntries.$inferSelect;

export type DayView = {
  date: DateString;
  entriesByMeal: Record<MealSlot, DiaryEntry[]>;
  mealTotals: Record<MealSlot, Nutrients>;
  totals: Nutrients;
  target: DailyTarget | null;
};

function toNutrients(entry: DiaryEntry): Nutrients {
  return {
    kcal: entry.kcal,
    protein: entry.protein,
    carb: entry.carb,
    fat: entry.fat,
    micros: entry.micros,
  };
}

/**
 * ข้อมูลทั้งวันในที่เดียว — ทั้งหน้าเว็บและ API อ่านผ่านฟังก์ชันนี้เท่านั้น
 * ตัวเลขบนทุกหน้าจอจึงตรงกันเสมอ ห้าม query diary_entries ตรงจาก component
 *
 * รวมยอดใน JavaScript ไม่ใช่ใน SQL โดยตั้งใจ เพื่อไม่ให้มีสูตรชุดที่สองที่ไม่มีเทสต์ครอบ
 */
export async function loadDay(userId: string, date: DateString = today()): Promise<DayView> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.entryDate, date)))
    .orderBy(diaryEntries.createdAt);

  const entriesByMeal = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  } as Record<MealSlot, DiaryEntry[]>;
  for (const row of rows) entriesByMeal[row.meal].push(row);

  const mealTotals = {
    breakfast: sumNutrients(entriesByMeal.breakfast.map(toNutrients)),
    lunch: sumNutrients(entriesByMeal.lunch.map(toNutrients)),
    dinner: sumNutrients(entriesByMeal.dinner.map(toNutrients)),
    snack: sumNutrients(entriesByMeal.snack.map(toNutrients)),
  };

  return {
    date,
    entriesByMeal,
    mealTotals,
    totals: sumNutrients(rows.map(toNutrients)),
    target: await ensureDailyTarget(userId, date),
  };
}

/**
 * บันทึกอาหารจากคลัง — server คำนวณสารอาหารเองจากฐานข้อมูล
 * ค่าที่ client ส่งมาถูกเมินทั้งหมด รับแค่ "กินอะไร เท่าไร"
 */
export async function addFoodEntry(
  userId: string,
  input: DiaryFoodEntryInput,
): Promise<DiaryEntry | null> {
  const [food] = await db.select().from(foods).where(eq(foods.id, input.foodId)).limit(1);
  if (!food) return null;

  let grams = input.grams;
  let servingLabel: string | null = null;

  if (input.servingId) {
    const [serving] = await db
      .select()
      .from(foodServings)
      // ตรวจว่าหน่วยนี้เป็นของอาหารรายการนี้จริง ไม่ใช่เชื่อ id ที่ client ส่งมา
      .where(and(eq(foodServings.id, input.servingId), eq(foodServings.foodId, input.foodId)))
      .limit(1);
    if (!serving) return null;
    grams = serving.grams * input.quantity;
    servingLabel = input.quantity === 1 ? serving.label : `${input.quantity} × ${serving.label}`;
  }

  if (!grams || grams <= 0) return null;

  const nutrients = scaleTo(
    {
      kcalPer100g: food.kcalPer100g,
      proteinPer100g: food.proteinPer100g,
      carbPer100g: food.carbPer100g,
      fatPer100g: food.fatPer100g,
      micros: food.micros,
    },
    grams,
  );

  const [entry] = await db
    .insert(diaryEntries)
    .values({
      userId,
      entryDate: input.entryDate,
      meal: input.meal,
      foodId: food.id,
      // คัดลอกชื่อมาเก็บ เผื่ออาหารต้นทางถูกลบทีหลัง
      name: food.nameTh ?? food.name,
      grams,
      servingLabel,
      ...nutrients,
    })
    .returning();

  return entry;
}

/** บันทึกแบบกรอกเอง สำหรับอาหารที่ไม่มีในคลัง */
export async function addQuickEntry(
  userId: string,
  input: DiaryQuickEntryInput,
): Promise<DiaryEntry> {
  const [entry] = await db
    .insert(diaryEntries)
    .values({
      userId,
      entryDate: input.entryDate,
      meal: input.meal,
      name: input.name,
      kcal: input.kcal,
      protein: input.protein,
      carb: input.carb,
      fat: input.fat,
      // กรอกเองไม่มีข้อมูลไมโคร — ปล่อยว่างไว้ ไม่ใช่เติมศูนย์
      micros: {} as Micros,
    })
    .returning();

  return entry;
}

/**
 * ลบด้วยเงื่อนไข id + userId ในคำสั่งเดียว ห้าม select ก่อนแล้วค่อยลบ (กัน race)
 * คืน false ทั้งกรณี "ไม่มี" และ "ไม่ใช่ของคุณ" เพื่อไม่ให้เดา id ของคนอื่นได้
 */
export async function deleteEntry(userId: string, entryId: string): Promise<boolean> {
  const deleted = await db
    .delete(diaryEntries)
    .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
    .returning({ id: diaryEntries.id });
  return deleted.length > 0;
}

/**
 * คัดลอกทั้งวันจากวันอื่น — ฟีเจอร์ที่ทำให้คนกินเมนูซ้ำ ๆ บันทึกเสร็จในแตะเดียว
 * คัดลอกตัวเลขที่ตรึงไว้ตอนนั้นมาตรง ๆ ไม่คำนวณใหม่จากคลัง
 * (อาหารต้นทางอาจถูกแก้ค่าไปแล้ว แต่สิ่งที่ผู้ใช้ตั้งใจคือ "กินเหมือนวันนั้น")
 */
export async function copyDay(
  userId: string,
  from: DateString,
  to: DateString,
  meals: MealSlot[] = MEAL_SLOTS,
): Promise<number> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(
      and(
        eq(diaryEntries.userId, userId),
        eq(diaryEntries.entryDate, from),
        inArray(diaryEntries.meal, meals),
      ),
    );
  if (rows.length === 0) return 0;

  await db.insert(diaryEntries).values(
    rows.map((row) => ({
      userId,
      entryDate: to,
      meal: row.meal,
      foodId: row.foodId,
      name: row.name,
      grams: row.grams,
      servingLabel: row.servingLabel,
      kcal: row.kcal,
      protein: row.protein,
      carb: row.carb,
      fat: row.fat,
      micros: row.micros,
    })),
  );

  return rows.length;
}
