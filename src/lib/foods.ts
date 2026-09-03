import "server-only";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { foods, foodServings } from "@/db/schema";

export type FoodHit = {
  id: string;
  name: string;
  nameTh: string | null;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  /** false = ข้อมูลจากผู้ใช้ทั่วโลก (บาร์โค้ด) หน้าจอควรบอกผู้ใช้ให้รู้ */
  verified: boolean;
};

export type FoodWithServings = typeof foods.$inferSelect & {
  servings: (typeof foodServings.$inferSelect)[];
};

/**
 * ค้นหาอาหาร — ค้นทั้งชื่อไทยและชื่ออังกฤษพร้อมกัน
 *
 * จัดอันดับ: รายการที่มีชื่อไทยขึ้นก่อนเสมอ เพราะคลัง USDA มีของแปลก ๆ ปนเยอะ
 * (เช่น "Bear, black, meat, raw") ส่วนที่แมปชื่อไทยไว้คือของที่คัดแล้วว่าคนไทยกินจริง
 * แล้วค่อยเรียงตามความใกล้เคียงของคำ และชื่อสั้นก่อน (ชื่อยาวมักเป็นสูตรเฉพาะยี่ห้อ)
 */
export async function searchFoods(query: string, userId: string, limit = 20): Promise<FoodHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed}%`;

  return db
    .select({
      id: foods.id,
      name: foods.name,
      nameTh: foods.nameTh,
      brand: foods.brand,
      kcalPer100g: foods.kcalPer100g,
      proteinPer100g: foods.proteinPer100g,
      carbPer100g: foods.carbPer100g,
      fatPer100g: foods.fatPer100g,
      verified: foods.verified,
    })
    .from(foods)
    .where(
      and(
        or(sql`${foods.nameTh} ILIKE ${pattern}`, sql`${foods.name} ILIKE ${pattern}`),
        // อาหารกลาง (created_by null) เห็นได้ทุกคน ส่วนของที่ผู้ใช้สร้างเองเห็นเฉพาะเจ้าของ
        or(isNull(foods.createdBy), eq(foods.createdBy, userId)),
      ),
    )
    .orderBy(
      sql`(${foods.nameTh} IS NOT NULL) DESC`,
      // ค่าจากห้องแล็บ (USDA) ต้องมาก่อนข้อมูลที่ผู้ใช้ทั่วโลกกรอกเอง (Open Food Facts)
      // ไม่งั้นสินค้าบาร์โค้ดที่ตัวเลขน่าสงสัยจะขึ้นปนกับข้อมูลที่เชื่อถือได้ในระดับเดียวกัน
      sql`${foods.verified} DESC`,
      sql`extensions.similarity(coalesce(${foods.nameTh}, ${foods.name}), ${trimmed}) DESC`,
      sql`length(${foods.name}) ASC`,
    )
    .limit(limit);
}

/** อาหารหนึ่งรายการพร้อมหน่วยครัวทั้งหมด — ใช้ตอนเปิดหน้าเลือกปริมาณ */
export async function getFoodWithServings(
  foodId: string,
  userId: string,
): Promise<FoodWithServings | null> {
  const [food] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), or(isNull(foods.createdBy), eq(foods.createdBy, userId))))
    .limit(1);
  if (!food) return null;

  const servings = await db
    .select()
    .from(foodServings)
    .where(eq(foodServings.foodId, foodId))
    // หน่วยหลักขึ้นก่อนเสมอ เพราะช่องเลือกใช้ตัวแรกเป็นค่าตั้งต้น
    .orderBy(sql`${foodServings.isDefault} DESC`, foodServings.grams);

  return { ...food, servings };
}
