import "server-only";
import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { diaryEntries, foods, foodServings } from "@/db/schema";
import { addDays, type DateString, today } from "./dates";
import { scaleTo, sumNutrients, type Nutrients } from "./nutrition";
import { ensureDailyTarget } from "./profile";
import type { DailyTarget } from "./nutrition";
import type { MealSlot, Micros } from "./types";
import { MEAL_SLOTS } from "./types";
import { getRecipe } from "./recipes";
import { perServing } from "./nutrition";
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

/**
 * บันทึกสูตรลงไดอารี — server คำนวณจากส่วนประกอบของสูตรเอง
 *
 * ตัวเลขถูก snapshot ตอนบันทึกตามกฎเดิม แก้สูตรทีหลังแล้วมื้อที่บันทึกไปแล้วไม่ขยับตาม
 * ไม่เก็บ foodId เพราะสูตรไม่ใช่อาหารหนึ่งรายการในคลัง
 */
export async function addRecipeEntry(
  userId: string,
  input: { recipeId: string; entryDate: DateString; meal: MealSlot; servings: number },
): Promise<DiaryEntry | null> {
  const recipe = await getRecipe(userId, input.recipeId);
  if (!recipe || recipe.ingredients.length === 0) return null;

  // perServing ของสูตรคูณด้วยจำนวนที่กิน = หารด้วย (1/servings)
  const eaten = perServing(recipe.perServing, 1 / input.servings);

  const [entry] = await db
    .insert(diaryEntries)
    .values({
      userId,
      entryDate: input.entryDate,
      meal: input.meal,
      name: recipe.name,
      grams: Math.round((recipe.totalGrams / recipe.servings) * input.servings * 100) / 100,
      servingLabel: input.servings === 1 ? "1 ที่" : `${input.servings} ที่`,
      ...eaten,
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

export type RecentFood = {
  /** id ของรายการเดิมที่ใช้เป็นต้นแบบ — ใช้บันทึกซ้ำแบบแตะเดียว */
  sourceEntryId: string;
  foodId: string | null;
  name: string;
  servingLabel: string | null;
  grams: number | null;
  kcal: number;
};

/**
 * อาหารที่เพิ่งกิน — เรียงตามความสดใหม่ ไม่ซ้ำรายการ
 *
 * คนส่วนใหญ่กินวนอยู่ไม่กี่อย่าง การให้พิมพ์ค้นใหม่ทุกมื้อคือความฝืดที่ใหญ่ที่สุด
 * ของแอปนับแคล รายการนี้จึงถูกแสดงทันทีที่เปิดแผ่นเพิ่มอาหาร ก่อนพิมพ์อะไรเลย
 *
 * ดึงมาเกินจำนวนที่ต้องใช้แล้วค่อยตัดซ้ำในหน่วยความจำ เพราะ DISTINCT ON ใน SQL
 * จะกลายเป็นตรรกะชุดที่สองที่เทสต์ไม่ครอบ (กฎเดียวกับการรวมยอดรายวัน)
 */
export async function getRecentFoods(userId: string, limit = 12): Promise<RecentFood[]> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(desc(diaryEntries.createdAt))
    .limit(limit * 8);

  const seen = new Set<string>();
  const result: RecentFood[] = [];
  for (const row of rows) {
    // นับว่าซ้ำเมื่อเป็นอาหารเดียวกันและปริมาณเท่ากัน — ข้าวสวย 1 ถ้วยกับ 2 ถ้วยคนละรายการ
    const key = `${row.foodId ?? row.name}|${row.servingLabel ?? ""}|${row.grams ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      sourceEntryId: row.id,
      foodId: row.foodId,
      name: row.name,
      servingLabel: row.servingLabel,
      grams: row.grams,
      kcal: row.kcal,
    });
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * บันทึกซ้ำจากรายการเดิมแบบแตะเดียว
 *
 * คัดลอกตัวเลขที่ตรึงไว้ตอนนั้นมาตรง ๆ เหมือน copyDay() ไม่คำนวณใหม่จากคลัง
 * เพราะสิ่งที่ผู้ใช้ตั้งใจคือ "เอาเหมือนเดิม" ไม่ใช่ "เอาค่าล่าสุดของอาหารนั้น"
 */
export async function repeatEntry(
  userId: string,
  sourceEntryId: string,
  meal: MealSlot,
  date: DateString,
): Promise<DiaryEntry | null> {
  const [source] = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.id, sourceEntryId), eq(diaryEntries.userId, userId)))
    .limit(1);
  if (!source) return null;

  const [entry] = await db
    .insert(diaryEntries)
    .values({
      userId,
      entryDate: date,
      meal,
      foodId: source.foodId,
      name: source.name,
      grams: source.grams,
      servingLabel: source.servingLabel,
      kcal: source.kcal,
      protein: source.protein,
      carb: source.carb,
      fat: source.fat,
      micros: source.micros,
    })
    .returning();

  return entry;
}

/**
 * แก้ปริมาณของรายการที่บันทึกไปแล้ว แล้วคำนวณสารอาหารใหม่จากคลัง
 *
 * เดิมกรอกผิดต้องลบทิ้งแล้วเพิ่มใหม่ ซึ่งทำให้ลำดับในไดอารีสลับและเสี่ยงลบผิดรายการ
 * ที่นี่ยังยึดกฎเดิม: server คำนวณตัวเลขเอง ไม่รับค่าจาก client
 */
export async function updateFoodEntryAmount(
  userId: string,
  entryId: string,
  input: { grams?: number; servingId?: string; quantity: number },
): Promise<DiaryEntry | null> {
  const [entry] = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
    .limit(1);
  if (!entry?.foodId) return null;

  const [food] = await db.select().from(foods).where(eq(foods.id, entry.foodId)).limit(1);
  if (!food) return null;

  let grams = input.grams;
  let servingLabel: string | null = null;

  if (input.servingId) {
    const [serving] = await db
      .select()
      .from(foodServings)
      .where(and(eq(foodServings.id, input.servingId), eq(foodServings.foodId, food.id)))
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

  const [updated] = await db
    .update(diaryEntries)
    .set({ grams, servingLabel, ...nutrients })
    // ใส่ user_id ในเงื่อนไขซ้ำอีกชั้น กันแก้ของคนอื่นแม้จะเช็คไปแล้วข้างบน
    .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
    .returning();

  return updated ?? null;
}

/** แก้รายการที่ผู้ใช้กรอกแคลเอง (ไม่มี foodId ให้คำนวณจากคลัง) */
export async function updateQuickEntry(
  userId: string,
  entryId: string,
  input: { name: string; kcal: number; protein: number; carb: number; fat: number },
): Promise<DiaryEntry | null> {
  const [updated] = await db
    .update(diaryEntries)
    .set({ ...input })
    .where(
      and(
        eq(diaryEntries.id, entryId),
        eq(diaryEntries.userId, userId),
        isNull(diaryEntries.foodId),
      ),
    )
    .returning();

  return updated ?? null;
}

export type IntakeStats = {
  windowDays: number;
  /** จำนวนวันที่มีการบันทึกอาหารอย่างน้อยหนึ่งรายการ */
  loggedDays: number;
  /** ค่าเฉลี่ยพลังงานต่อวัน นับเฉพาะวันที่บันทึก */
  avgIntakeKcal: number;
};

/**
 * สถิติการกินย้อนหลัง สำหรับใช้ประมาณ TDEE จริง (ดู lib/adaptive.ts)
 *
 * นับ "วันที่บันทึก" แยกจาก "ความยาวช่วง" โดยตั้งใจ เพราะถ้าเอาพลังงานทั้งหมด
 * หารด้วยจำนวนวันทั้งช่วง วันที่ลืมบันทึกจะถูกนับเป็นกินศูนย์แคล
 * แล้วระบบจะสรุปว่าเผาผลาญน้อยกว่าความจริงมาก และตั้งเป้าต่ำเกินไปจนอันตราย
 *
 * รวมยอดใน JavaScript ตามกฎของโปรเจกต์ ไม่เขียนสูตรชุดที่สองลง SQL
 */
export async function getIntakeStats(
  userId: string,
  windowDays = 28,
  onDate: DateString = today(),
): Promise<IntakeStats> {
  const since = addDays(onDate, -(windowDays - 1));
  const rows = await db
    .select({ entryDate: diaryEntries.entryDate, kcal: diaryEntries.kcal })
    .from(diaryEntries)
    .where(
      and(
        eq(diaryEntries.userId, userId),
        gte(diaryEntries.entryDate, since),
        lte(diaryEntries.entryDate, onDate),
      ),
    );

  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.entryDate, (byDate.get(row.entryDate) ?? 0) + row.kcal);
  }

  const totals = [...byDate.values()];
  const loggedDays = totals.length;
  const avgIntakeKcal =
    loggedDays > 0 ? Math.round(totals.reduce((a, b) => a + b, 0) / loggedDays) : 0;

  return { windowDays, loggedDays, avgIntakeKcal };
}

/**
 * ความสม่ำเสมอของการบันทึก — "5 จาก 7 วัน" ไม่ใช่ streak ที่ขาดแล้วรีเซ็ตเป็นศูนย์
 *
 * งานวิจัยเรื่องการติดตามอาหารชี้ว่าการบันทึกต่อเนื่องแบบหยาบ ๆ ได้ผลกว่า
 * บันทึกละเอียดแล้วเลิกกลางทาง streak ที่ขาดคือจุดที่คนเลิกใช้แอป
 * ตัวเลขแบบนี้จึงให้กำลังใจโดยไม่ลงโทษคนที่พลาดไปวันสองวัน
 */
export async function getLoggingStreak(
  userId: string,
  windowDays = 7,
  onDate: DateString = today(),
): Promise<{ loggedDays: number; windowDays: number }> {
  const stats = await getIntakeStats(userId, windowDays, onDate);
  return { loggedDays: stats.loggedDays, windowDays };
}
